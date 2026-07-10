import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

/**
 * POST /api/inventario/descarga
 *
 * Used by the technician (or the office, if needed) to discharge equipment
 * INTO an installation. Body:
 *   {
 *     contrato_id: number,
 *     cuadrilla_id: number,
 *     usuario_registro?: string,
 *     observaciones?: string,
 *     // 0..N serial rows already owned by the cuadrilla:
 *     serial_ids?: number[],
 *     // 0..N misc consumables drawn from the cuadrilla bucket:
 *     miscelaneo?: Array<{ producto_id: number, cantidad: number }>,
 *   }
 *
 * Side effects:
 *   - For each serial_id: estado -> "Instalado", ubicacion -> "Cliente",
 *     contrato_id linked, cuadrilla_id cleared.
 *   - For each miscelaneo entry: decrement the cuadrilla bucket and write a
 *     "Descarga_Instalacion" transaction; nothing is created at the client side
 *     since miscellaneous consumables are spent (no serial to track).
 *   - For each affected item: one transacciones_inventario row.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      contrato_id,
      cuadrilla_id,
      serial_ids,
      miscelaneo,
      usuario_registro,
      observaciones,
    } = body

    console.log("[v0] /api/inventario/descarga body", {
      contrato_id,
      cuadrilla_id,
      serial_ids,
      miscelaneo,
    })

    if (!contrato_id || !cuadrilla_id) {
      return NextResponse.json(
        { success: false, error: "contrato_id y cuadrilla_id son requeridos" },
        { status: 400 },
      )
    }

    const supabase = await getSupabaseServerClient()
    const txRows: any[] = []
    let totalSeriales = 0
    let totalMisc = 0

    // 1. Serializados
    const ids: number[] = Array.isArray(serial_ids) ? serial_ids.map(Number) : []
    if (ids.length > 0) {
      const { data: rows, error: rowsErr } = await supabase
        .from("inventario_serializado")
        .select("id, producto_id, ubicacion, estado, cuadrilla_id")
        .in("id", ids)
      if (rowsErr) throw rowsErr

      for (const r of rows || []) {
        if (r.estado !== "Disponible") {
          return NextResponse.json(
            { success: false, error: `Serial #${r.id} no esta Disponible` },
            { status: 400 },
          )
        }
        if (r.ubicacion !== "Cuadrilla" || r.cuadrilla_id !== cuadrilla_id) {
          return NextResponse.json(
            { success: false, error: `Serial #${r.id} no pertenece a esta cuadrilla` },
            { status: 400 },
          )
        }
      }

      const { error: upErr } = await supabase
        .from("inventario_serializado")
        .update({
          estado: "Instalado",
          ubicacion: "Cliente",
          contrato_id,
          cuadrilla_id: null,
        })
        .in("id", ids)
      if (upErr) throw upErr

      for (const r of rows || []) {
        txRows.push({
          tipo_movimiento: "Descarga_Instalacion",
          producto_id: r.producto_id,
          serial_id: r.id,
          cantidad: 1,
          origen_detalle: `Cuadrilla #${cuadrilla_id}`,
          destino_detalle: `Cliente (contrato ${contrato_id})`,
          cuadrilla_id,
          contrato_id,
          usuario_registro: usuario_registro || null,
          observaciones: observaciones || null,
        })
      }
      totalSeriales = ids.length
    }

    // 2. Miscelaneo
    const misc: Array<{ producto_id: number; cantidad: number }> =
      Array.isArray(miscelaneo) ? miscelaneo : []
    for (const m of misc) {
      const productoId = Number(m.producto_id)
      const cant = Number(m.cantidad)
      if (!productoId || !Number.isFinite(cant) || cant <= 0) continue

      const { data: src, error: srcErr } = await supabase
        .from("inventario_miscelaneo")
        .select("id, cantidad")
        .eq("producto_id", productoId)
        .eq("ubicacion", "Cuadrilla")
        .eq("cuadrilla_id", cuadrilla_id)
        .maybeSingle()
      if (srcErr) throw srcErr
      const have = Number(src?.cantidad || 0)
      if (have < cant) {
        return NextResponse.json(
          {
            success: false,
            error: `Stock insuficiente para el producto ${productoId}. Disponible: ${have}`,
          },
          { status: 400 },
        )
      }
      if (src) {
        const { error: uErr } = await supabase
          .from("inventario_miscelaneo")
          .update({ cantidad: have - cant })
          .eq("id", src.id)
        if (uErr) throw uErr
      }
      txRows.push({
        tipo_movimiento: "Descarga_Instalacion",
        producto_id: productoId,
        serial_id: null,
        cantidad: cant,
        origen_detalle: `Cuadrilla #${cuadrilla_id}`,
        destino_detalle: `Cliente (contrato ${contrato_id})`,
        cuadrilla_id,
        contrato_id,
        usuario_registro: usuario_registro || null,
        observaciones: observaciones || null,
      })
      totalMisc += 1
    }

    console.log("[v0] descarga txRows to insert", { count: txRows.length, txRows })

    if (txRows.length > 0) {
      const { error: txErr } = await supabase
        .from("transacciones_inventario")
        .insert(txRows)
      if (txErr) {
        console.log("[v0] descarga transacciones_inventario insert error", txErr)
        throw txErr
      }
    }

    console.log("[v0] descarga success", { seriales: totalSeriales, miscelaneo: totalMisc })

    return NextResponse.json({
      success: true,
      data: { seriales: totalSeriales, miscelaneo: totalMisc },
    })
  } catch (e: any) {
    console.log("[v0] /api/inventario/descarga fatal error", {
      message: e?.message,
      details: e?.details,
      hint: e?.hint,
      code: e?.code,
    })
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
