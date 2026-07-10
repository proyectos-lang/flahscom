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

    // Build query with joins to contratos, clientes, cuadrillas
    let query = supabase
      .from("instalaciones")
      .select(`
        id,
        contrato_id,
        cuadrilla_id,
        estatus_instalacion,
        fecha_programada,
        bloque_horario,
        fecha_real_instalacion,
        hora_inicio,
        hora_fin,
        serie_ont_router,
        serie_antena_receptor,
        url_foto_potencia_caset,
        url_foto_pi_fibra,
        url_foto_pf_fibra,
        url_foto_numeracion_nap,
        url_foto_etiqueta_cliente_nap,
        url_foto_potencia_liuk,
        url_foto_serie_equipo,
        url_foto_potencia_interna,
        url_foto_contrasena,
        url_foto_test_velocidad,
        url_foto_estetico_equipos,
        url_foto_tv_pantalla,
        url_firma_cliente,
        observaciones_tecnicas,
        created_at,
        contratos!inner (
          id,
          cliente_id,
          paquete_id,
          nombre_paquete,
          valor_paquete,
          clientes (
            id,
            nombre_completo,
            numero_identidad,
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

    // Filter by estatus
    if (estatus) {
      query = query.eq("estatus_instalacion", estatus)
    }

    // Filter by cuadrilla
    if (cuadrillaId) {
      query = query.eq("cuadrilla_id", Number(cuadrillaId))
    }

    // Filter by fecha range
    if (fechaDesde) {
      query = query.gte("fecha_programada", fechaDesde)
    }
    if (fechaHasta) {
      query = query.lte("fecha_programada", fechaHasta)
    }

    // Search by contrato id (text search on nested joins isn't supported, we filter client-side)
    if (search && !isNaN(Number(search))) {
      query = query.eq("contrato_id", Number(search))
    }

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error("[v0] Error fetching historial:", error)
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
    console.error("[v0] Error in historial-instalaciones:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
