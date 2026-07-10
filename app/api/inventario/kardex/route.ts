import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

// GET /api/inventario/kardex
// History of every inventory movement, joined manually with product, serial,
// cuadrilla and contract names so the UI table renders without further calls.
// Optional filters: tipo_movimiento, producto_id, cuadrilla_id, contrato_id,
// desde (ISO date), hasta (ISO date), search (over numero_serie/observaciones).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get("tipo_movimiento")
    const productoId = searchParams.get("producto_id")
    const cuadrillaId = searchParams.get("cuadrilla_id")
    const contratoId = searchParams.get("contrato_id")
    // ubicacion=bodega narrows the kardex to movements where Bodega Principal
    // participated (incoming receipts, transfers out to a cuadrilla, returns
    // back from a cuadrilla). Descarga_Instalacion never touches Bodega so it
    // is excluded. When ubicacion is omitted we return everything (subject to
    // the other filters).
    const ubicacion = searchParams.get("ubicacion")
    const desde = searchParams.get("desde")
    const hasta = searchParams.get("hasta")
    const search = (searchParams.get("search") || "").trim()
    const limit = Math.min(Number(searchParams.get("limit") || 200), 500)

    const supabase = await getSupabaseServerClient()

    let query = supabase
      .from("transacciones_inventario")
      .select(
        "id, tipo_movimiento, producto_id, serial_id, cantidad, origen_detalle, destino_detalle, cuadrilla_id, contrato_id, usuario_registro, fecha, observaciones",
      )
      .order("fecha", { ascending: false })
      .limit(limit)

    if (tipo) query = query.eq("tipo_movimiento", tipo)
    if (productoId) query = query.eq("producto_id", Number(productoId))
    if (cuadrillaId) query = query.eq("cuadrilla_id", Number(cuadrillaId))
    if (contratoId) query = query.eq("contrato_id", Number(contratoId))
    if (ubicacion === "bodega") {
      query = query.in("tipo_movimiento", [
        "Ingreso_Bodega",
        "Transferencia_Cuadrilla",
        "Retorno_Bodega",
      ])
    }
    if (desde) query = query.gte("fecha", desde)
    if (hasta) query = query.lte("fecha", hasta)
    if (search) query = query.ilike("observaciones", `%${search}%`)

    const { data: tx, error } = await query
    if (error) throw error

    const productoIds = Array.from(
      new Set((tx || []).map((t: any) => t.producto_id).filter(Boolean)),
    ) as number[]
    const cuadrillaIds = Array.from(
      new Set((tx || []).map((t: any) => t.cuadrilla_id).filter(Boolean)),
    ) as number[]
    const serialIds = Array.from(
      new Set((tx || []).map((t: any) => t.serial_id).filter(Boolean)),
    ) as number[]

    const [prodRes, cuadRes, serRes] = await Promise.all([
      productoIds.length
        ? supabase
            .from("catalogo_productos")
            .select("id, nombre, tipo, unidad_medida")
            .in("id", productoIds)
        : Promise.resolve({ data: [], error: null } as any),
      cuadrillaIds.length
        ? supabase
            .from("cuadrillas")
            .select("id, nombre_cuadrilla")
            .in("id", cuadrillaIds)
        : Promise.resolve({ data: [], error: null } as any),
      serialIds.length
        ? supabase
            .from("inventario_serializado")
            .select("id, numero_serie")
            .in("id", serialIds)
        : Promise.resolve({ data: [], error: null } as any),
    ])

    const prodMap: Record<number, any> = {}
    for (const p of prodRes.data || []) prodMap[p.id] = p
    const cuadMap: Record<number, any> = {}
    for (const c of cuadRes.data || []) cuadMap[c.id] = c
    const serMap: Record<number, any> = {}
    for (const s of serRes.data || []) serMap[s.id] = s

    const enriched = (tx || []).map((t: any) => ({
      ...t,
      producto: prodMap[t.producto_id] || null,
      cuadrilla: t.cuadrilla_id ? cuadMap[t.cuadrilla_id] || null : null,
      serial: t.serial_id ? serMap[t.serial_id] || null : null,
    }))

    return NextResponse.json({ success: true, data: enriched })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
