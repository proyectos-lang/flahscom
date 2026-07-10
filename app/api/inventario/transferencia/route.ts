import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

/**
 * POST /api/inventario/transferencia
 *
 * Moves stock between Bodega and Cuadrilla (or vice-versa).
 *
 * Body:
 *   {
 *     direccion: "Bodega_A_Cuadrilla" | "Cuadrilla_A_Bodega",
 *     producto_id: number,
 *     cuadrilla_id: number,
 *     // For Serializado:
 *     serial_ids?: number[],
 *     // For Miscelaneo:
 *     cantidad?: number,
 *     usuario_registro?: string,
 *     observaciones?: string,
 *   }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      direccion,
      producto_id,
      cuadrilla_id,
      cuadrilla_destino_id,
      serial_ids,
      cantidad,
      usuario_registro,
      observaciones,
    } = body

    if (
      !direccion ||
      !["Bodega_A_Cuadrilla", "Cuadrilla_A_Bodega", "Cuadrilla_A_Cuadrilla"].includes(direccion)
    ) {
      return NextResponse.json(
        { success: false, error: "direccion invalida" },
        { status: 400 },
      )
    }
    if (!producto_id || !cuadrilla_id) {
      return NextResponse.json(
        { success: false, error: "producto_id y cuadrilla_id son requeridos" },
        { status: 400 },
      )
    }

    const isC2C = direccion === "Cuadrilla_A_Cuadrilla"
    if (isC2C) {
      if (!cuadrilla_destino_id) {
        return NextResponse.json(
          { success: false, error: "cuadrilla_destino_id es requerido" },
          { status: 400 },
        )
      }
      if (Number(cuadrilla_destino_id) === Number(cuadrilla_id)) {
        return NextResponse.json(
          { success: false, error: "La cuadrilla de origen y destino deben ser diferentes" },
          { status: 400 },
        )
      }
    }

    const supabase = await getSupabaseServerClient()

    const { data: producto, error: prodErr } = await supabase
      .from("catalogo_productos")
      .select("id, tipo")
      .eq("id", producto_id)
      .single()
    if (prodErr || !producto) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 },
      )
    }

    const isOut = direccion === "Bodega_A_Cuadrilla"
    const txTipo = isC2C ? "Transferencia_Cuadrilla" : isOut ? "Transferencia_Cuadrilla" : "Retorno_Bodega"
    const origen = isC2C ? `Cuadrilla #${cuadrilla_id}` : isOut ? "Bodega" : `Cuadrilla #${cuadrilla_id}`
    const destino = isC2C
      ? `Cuadrilla #${cuadrilla_destino_id}`
      : isOut
        ? `Cuadrilla #${cuadrilla_id}`
        : "Bodega"
    // The transactions row keeps a single cuadrilla_id; for C2C we record the
    // destination cuadrilla (where the stock ends up).
    const txCuadrillaId = isC2C ? cuadrilla_destino_id : cuadrilla_id

    if (producto.tipo === "Serializado") {
      const ids: number[] = Array.isArray(serial_ids) ? serial_ids.map(Number) : []
      if (ids.length === 0) {
        return NextResponse.json(
          { success: false, error: "Debe seleccionar al menos un serial" },
          { status: 400 },
        )
      }

      // Validate that all serials are in the expected source location/state.
      const { data: rows, error: rowsErr } = await supabase
        .from("inventario_serializado")
        .select("id, ubicacion, estado, cuadrilla_id")
        .in("id", ids)
      if (rowsErr) throw rowsErr

      for (const r of rows || []) {
        if (r.estado !== "Disponible") {
          return NextResponse.json(
            { success: false, error: `Serial #${r.id} no esta Disponible` },
            { status: 400 },
          )
        }
        if (isOut && r.ubicacion !== "Bodega") {
          return NextResponse.json(
            { success: false, error: `Serial #${r.id} no esta en Bodega` },
            { status: 400 },
          )
        }
        // For both Cuadrilla_A_Bodega and Cuadrilla_A_Cuadrilla the serial
        // must currently live in the source cuadrilla.
        if (
          (isC2C || !isOut) &&
          (r.ubicacion !== "Cuadrilla" || r.cuadrilla_id !== cuadrilla_id)
        ) {
          return NextResponse.json(
            { success: false, error: `Serial #${r.id} no pertenece a la cuadrilla de origen` },
            { status: 400 },
          )
        }
      }

      const update = isC2C
        ? { ubicacion: "Cuadrilla", cuadrilla_id: cuadrilla_destino_id }
        : isOut
          ? { ubicacion: "Cuadrilla", cuadrilla_id }
          : { ubicacion: "Bodega", cuadrilla_id: null }
      const { error: upErr } = await supabase
        .from("inventario_serializado")
        .update(update)
        .in("id", ids)
      if (upErr) throw upErr

      const txRows = ids.map((sid) => ({
        tipo_movimiento: txTipo,
        producto_id,
        serial_id: sid,
        cantidad: 1,
        origen_detalle: origen,
        destino_detalle: destino,
        cuadrilla_id: txCuadrillaId,
        contrato_id: null,
        usuario_registro: usuario_registro || null,
        observaciones: observaciones || null,
      }))
      const { error: txErr } = await supabase
        .from("transacciones_inventario")
        .insert(txRows)
      if (txErr) throw txErr

      return NextResponse.json({ success: true, data: { count: ids.length } })
    }

    // Miscelaneo
    const cant = Number(cantidad)
    if (!Number.isFinite(cant) || cant <= 0) {
      return NextResponse.json(
        { success: false, error: "La cantidad debe ser un numero mayor a 0" },
        { status: 400 },
      )
    }

    const sourceUbicacion = isC2C ? "Cuadrilla" : isOut ? "Bodega" : "Cuadrilla"
    const destUbicacion = isC2C ? "Cuadrilla" : isOut ? "Cuadrilla" : "Bodega"
    const sourceCuadrilla = isC2C ? cuadrilla_id : isOut ? null : cuadrilla_id
    const destCuadrilla = isC2C ? cuadrilla_destino_id : isOut ? cuadrilla_id : null

    // Read source bucket and validate it has enough stock.
    let srcQuery = supabase
      .from("inventario_miscelaneo")
      .select("id, cantidad")
      .eq("producto_id", producto_id)
      .eq("ubicacion", sourceUbicacion)
    srcQuery = sourceCuadrilla === null
      ? srcQuery.is("cuadrilla_id", null)
      : srcQuery.eq("cuadrilla_id", sourceCuadrilla)
    const { data: src, error: srcErr } = await srcQuery.maybeSingle()
    if (srcErr) throw srcErr
    const srcQty = Number(src?.cantidad || 0)
    if (srcQty < cant) {
      return NextResponse.json(
        { success: false, error: `Stock insuficiente. Disponible: ${srcQty}` },
        { status: 400 },
      )
    }

    // Decrement source.
    if (src) {
      const { error: dErr } = await supabase
        .from("inventario_miscelaneo")
        .update({ cantidad: srcQty - cant })
        .eq("id", src.id)
      if (dErr) throw dErr
    }

    // Increment destination (insert or update).
    let destQuery = supabase
      .from("inventario_miscelaneo")
      .select("id, cantidad")
      .eq("producto_id", producto_id)
      .eq("ubicacion", destUbicacion)
    destQuery = destCuadrilla === null
      ? destQuery.is("cuadrilla_id", null)
      : destQuery.eq("cuadrilla_id", destCuadrilla)
    const { data: dst, error: dstErr } = await destQuery.maybeSingle()
    if (dstErr) throw dstErr

    if (dst) {
      const { error: uErr } = await supabase
        .from("inventario_miscelaneo")
        .update({ cantidad: Number(dst.cantidad || 0) + cant })
        .eq("id", dst.id)
      if (uErr) throw uErr
    } else {
      const { error: iErr } = await supabase.from("inventario_miscelaneo").insert({
        producto_id,
        ubicacion: destUbicacion,
        cuadrilla_id: destCuadrilla,
        cantidad: cant,
      })
      if (iErr) throw iErr
    }

    const { error: txErr } = await supabase.from("transacciones_inventario").insert({
      tipo_movimiento: txTipo,
      producto_id,
      serial_id: null,
      cantidad: cant,
      origen_detalle: origen,
      destino_detalle: destino,
      cuadrilla_id: txCuadrillaId,
      contrato_id: null,
      usuario_registro: usuario_registro || null,
      observaciones: observaciones || null,
    })
    if (txErr) throw txErr

    return NextResponse.json({ success: true, data: { count: cant } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
