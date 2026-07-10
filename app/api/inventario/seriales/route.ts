import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

// GET /api/inventario/seriales
// Lists individual serial rows, used by transfer / return pickers and by the
// Catalogo detail view. Filters: producto_id, ubicacion, cuadrilla_id, estado,
// search (over numero_serie). Joins with catalogo_productos and cuadrillas
// manually so the response always carries human-readable labels.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const productoId = searchParams.get("producto_id")
    const ubicacion = searchParams.get("ubicacion")
    const cuadrillaId = searchParams.get("cuadrilla_id")
    const estado = searchParams.get("estado")
    const search = (searchParams.get("search") || "").trim()

    const supabase = await getSupabaseServerClient()

    let query = supabase
      .from("inventario_serializado")
      .select(
        "id, producto_id, numero_serie, estado, ubicacion, cuadrilla_id, contrato_id, fecha_ingreso",
      )
      .order("fecha_ingreso", { ascending: false })

    if (productoId) query = query.eq("producto_id", Number(productoId))
    if (ubicacion) query = query.eq("ubicacion", ubicacion)
    if (cuadrillaId) query = query.eq("cuadrilla_id", Number(cuadrillaId))
    if (estado) query = query.eq("estado", estado)
    if (search) query = query.ilike("numero_serie", `%${search}%`)

    const { data: seriales, error } = await query
    if (error) throw error

    // Stitch product + cuadrilla labels in code (no FK hint dependency).
    const productoIds = Array.from(
      new Set((seriales || []).map((s: any) => s.producto_id).filter(Boolean)),
    ) as number[]
    const cuadrillaIds = Array.from(
      new Set((seriales || []).map((s: any) => s.cuadrilla_id).filter(Boolean)),
    ) as number[]

    const [prodRes, cuadRes] = await Promise.all([
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
    ])

    const prodMap: Record<number, any> = {}
    for (const p of prodRes.data || []) prodMap[p.id] = p
    const cuadMap: Record<number, any> = {}
    for (const c of cuadRes.data || []) cuadMap[c.id] = c

    const enriched = (seriales || []).map((s: any) => ({
      ...s,
      producto: prodMap[s.producto_id] || null,
      cuadrilla: s.cuadrilla_id ? cuadMap[s.cuadrilla_id] || null : null,
    }))

    return NextResponse.json({ success: true, data: enriched })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
