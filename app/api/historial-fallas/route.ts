import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const estatus = searchParams.get("estatus") || ""
    const cuadrillaId = searchParams.get("cuadrilla_id") || ""
    const fechaDesde = searchParams.get("fecha_desde") || ""
    const fechaHasta = searchParams.get("fecha_hasta") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = 20

    const supabase = await getSupabaseServerClient()

    let query = supabase
      .from("fallas")
      .select(`
        id,
        contrato_id,
        cuadrilla_id,
        reportado_por,
        telefono_contacto_adicional,
        tipo_falla,
        descripcion_falla,
        estatus_falla,
        fecha_programada,
        bloque_horario,
        fecha_preferencia_cliente,
        fecha_real_resolucion,
        hora_inicio,
        hora_fin,
        observaciones_tecnico,
        urls_evidencias,
        url_firma_cliente,
        created_at,
        contratos (
          id,
          cliente_id,
          nombre_paquete,
          clientes (
            id,
            nombre_completo,
            telefono,
            direccion
          )
        ),
        cuadrillas (
          id,
          nombre_cuadrilla,
          lider_nombre
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false })

    if (estatus) {
      query = query.eq("estatus_falla", estatus)
    }
    if (cuadrillaId) {
      query = query.eq("cuadrilla_id", Number(cuadrillaId))
    }
    if (fechaDesde) {
      query = query.gte("fecha_programada", fechaDesde)
    }
    if (fechaHasta) {
      query = query.lte("fecha_programada", fechaHasta)
    }
    if (search && !isNaN(Number(search))) {
      query = query.eq("contrato_id", Number(search))
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error("[v0] Error fetching historial fallas:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error: any) {
    console.error("[v0] Error in historial-fallas:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
