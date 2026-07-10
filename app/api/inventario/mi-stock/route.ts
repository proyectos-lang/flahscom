import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

// GET /api/inventario/mi-stock?cuadrilla_id=...
// Used by the technician view ("Mi Inventario" tab) to render BOTH the
// available serial rows and the consumable buckets currently assigned to
// that cuadrilla. We include `producto` info on each item so the mobile UI
// can group by product without extra queries.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cuadrillaId = Number(searchParams.get("cuadrilla_id") || 0)
    if (!cuadrillaId) {
      return NextResponse.json(
        { success: false, error: "cuadrilla_id es requerido" },
        { status: 400 },
      )
    }

    const supabase = await getSupabaseServerClient()

    const [serRes, miscRes] = await Promise.all([
      supabase
        .from("inventario_serializado")
        .select("id, producto_id, numero_serie, estado, ubicacion, fecha_ingreso")
        .eq("cuadrilla_id", cuadrillaId)
        .eq("ubicacion", "Cuadrilla")
        .eq("estado", "Disponible")
        .order("fecha_ingreso", { ascending: false }),
      supabase
        .from("inventario_miscelaneo")
        .select("id, producto_id, cantidad")
        .eq("cuadrilla_id", cuadrillaId)
        .eq("ubicacion", "Cuadrilla")
        .gt("cantidad", 0),
    ])

    if (serRes.error) throw serRes.error
    if (miscRes.error) throw miscRes.error

    const productoIds = Array.from(
      new Set([
        ...(serRes.data || []).map((s: any) => s.producto_id),
        ...(miscRes.data || []).map((m: any) => m.producto_id),
      ].filter(Boolean)),
    ) as number[]

    const prodMap: Record<number, any> = {}
    if (productoIds.length > 0) {
      const { data: prods, error: pErr } = await supabase
        .from("catalogo_productos")
        .select("id, nombre, tipo, unidad_medida")
        .in("id", productoIds)
      if (pErr) throw pErr
      for (const p of prods || []) prodMap[p.id] = p
    }

    const seriales = (serRes.data || []).map((s: any) => ({
      ...s,
      producto: prodMap[s.producto_id] || null,
    }))
    const miscelaneo = (miscRes.data || []).map((m: any) => ({
      ...m,
      producto: prodMap[m.producto_id] || null,
    }))

    return NextResponse.json({
      success: true,
      data: { seriales, miscelaneo },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
