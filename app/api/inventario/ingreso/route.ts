import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

/**
 * POST /api/inventario/ingreso
 *
 * Registers an inbound stock movement to Bodega.
 *
 * For Serializado products body shape:
 *   { producto_id, seriales: string[], origen_detalle?, observaciones?, usuario_registro? }
 * For Miscelaneo:
 *   { producto_id, cantidad: number, origen_detalle?, observaciones?, usuario_registro? }
 *
 * For each created serial we also record one row in transacciones_inventario
 * with tipo_movimiento = "Ingreso_Bodega" so the kardex shows full history.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      producto_id,
      seriales,
      cantidad,
      origen_detalle,
      observaciones,
      usuario_registro,
    } = body

    if (!producto_id) {
      return NextResponse.json(
        { success: false, error: "producto_id es requerido" },
        { status: 400 },
      )
    }

    const supabase = await getSupabaseServerClient()

    // Verify product exists and read its tipo to decide the branch.
    const { data: producto, error: prodErr } = await supabase
      .from("catalogo_productos")
      .select("id, tipo, nombre")
      .eq("id", producto_id)
      .single()
    if (prodErr || !producto) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 },
      )
    }

    if (producto.tipo === "Serializado") {
      const list: string[] = Array.isArray(seriales) ? seriales : []
      const cleaned = list.map((s) => String(s || "").trim()).filter(Boolean)
      if (cleaned.length === 0) {
        return NextResponse.json(
          { success: false, error: "Debe ingresar al menos un numero de serie" },
          { status: 400 },
        )
      }

      const inserts = cleaned.map((numero_serie) => ({
        producto_id,
        numero_serie,
        estado: "Disponible",
        ubicacion: "Bodega",
        cuadrilla_id: null,
        contrato_id: null,
      }))
      const { data: newRows, error: insErr } = await supabase
        .from("inventario_serializado")
        .insert(inserts)
        .select("id, numero_serie")
      if (insErr) throw insErr

      const txRows = (newRows || []).map((r: any) => ({
        tipo_movimiento: "Ingreso_Bodega",
        producto_id,
        serial_id: r.id,
        cantidad: 1,
        origen_detalle: origen_detalle || "Compra/Ingreso",
        destino_detalle: "Bodega",
        cuadrilla_id: null,
        contrato_id: null,
        usuario_registro: usuario_registro || null,
        observaciones: observaciones || null,
      }))
      if (txRows.length > 0) {
        const { error: txErr } = await supabase
          .from("transacciones_inventario")
          .insert(txRows)
        if (txErr) throw txErr
      }

      return NextResponse.json({
        success: true,
        data: { inserted: newRows?.length || 0 },
      })
    }

    // Miscelaneo
    const cant = Number(cantidad)
    if (!Number.isFinite(cant) || cant <= 0) {
      return NextResponse.json(
        { success: false, error: "La cantidad debe ser un numero mayor a 0" },
        { status: 400 },
      )
    }

    // Upsert pattern: try to read the unique row (producto_id, ubicacion=Bodega,
    // cuadrilla_id=null) and update its cantidad; else insert it.
    const { data: existing, error: exErr } = await supabase
      .from("inventario_miscelaneo")
      .select("id, cantidad")
      .eq("producto_id", producto_id)
      .eq("ubicacion", "Bodega")
      .is("cuadrilla_id", null)
      .maybeSingle()
    if (exErr) throw exErr

    if (existing) {
      const nuevaCantidad = Number(existing.cantidad || 0) + cant
      const { error: upErr } = await supabase
        .from("inventario_miscelaneo")
        .update({ cantidad: nuevaCantidad })
        .eq("id", existing.id)
      if (upErr) throw upErr
    } else {
      const { error: insErr } = await supabase
        .from("inventario_miscelaneo")
        .insert({
          producto_id,
          ubicacion: "Bodega",
          cuadrilla_id: null,
          cantidad: cant,
        })
      if (insErr) throw insErr
    }

    const { error: txErr } = await supabase.from("transacciones_inventario").insert({
      tipo_movimiento: "Ingreso_Bodega",
      producto_id,
      serial_id: null,
      cantidad: cant,
      origen_detalle: origen_detalle || "Compra/Ingreso",
      destino_detalle: "Bodega",
      cuadrilla_id: null,
      contrato_id: null,
      usuario_registro: usuario_registro || null,
      observaciones: observaciones || null,
    })
    if (txErr) throw txErr

    return NextResponse.json({ success: true, data: { inserted: 1 } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
