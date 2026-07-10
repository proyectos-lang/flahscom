import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"

/**
 * Seguimiento de Fallos - returns ALL resolved fallas across all pages so the
 * UI can group them by contract and detect reincidencias (2+ resolved fallas
 * on the same contract). Supports optional filters by cuadrilla and a date
 * range over fecha_real_resolucion.
 *
 * The query bypasses PostgREST's default 1000-row cap by paginating in
 * batches of 1000 and concatenating the results.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cuadrillaId = searchParams.get("cuadrilla_id") || ""
    const fechaDesde = searchParams.get("fecha_desde") || ""
    const fechaHasta = searchParams.get("fecha_hasta") || ""

    const supabase = await getSupabaseServerClient()

    const buildBaseQuery = () => {
      let q = supabase
        .from("fallas")
        .select(
          `
          id,
          contrato_id,
          cuadrilla_id,
          tipo_falla,
          descripcion_falla,
          estatus_falla,
          fecha_real_resolucion,
          observaciones_tecnico,
          created_at,
          contratos (
            id,
            nombre_paquete,
            clientes (
              id,
              nombre_completo,
              telefono
            )
          ),
          cuadrillas (
            id,
            nombre_cuadrilla,
            lider_nombre
          )
          `
        )
        .eq("estatus_falla", "resuelta")
        .order("fecha_real_resolucion", { ascending: false, nullsFirst: false })

      if (cuadrillaId) q = q.eq("cuadrilla_id", Number(cuadrillaId))
      if (fechaDesde) q = q.gte("fecha_real_resolucion", fechaDesde)
      if (fechaHasta) q = q.lte("fecha_real_resolucion", fechaHasta)
      return q
    }

    // Batch through results in chunks of 1000 to bypass PostgREST default cap
    const BATCH_SIZE = 1000
    const all: any[] = []
    for (let iter = 0; iter < 100; iter++) {
      const from = iter * BATCH_SIZE
      const to = from + BATCH_SIZE - 1
      const { data, error } = await buildBaseQuery().range(from, to)
      if (error) {
        console.error("[v0] Error fetching seguimiento batch:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      const rows = data || []
      all.push(...rows)
      if (rows.length < BATCH_SIZE) break
    }

    return NextResponse.json({
      success: true,
      data: all,
      total: all.length,
    })
  } catch (error: any) {
    console.error("[v0] Error in seguimiento endpoint:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
