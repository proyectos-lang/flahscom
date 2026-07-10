import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// GET: list dotaciones.
// Supports filtering by empleado_id, fecha_desde, fecha_hasta. Always joins
// employees to return `empleado_nombre` and `empleado_identificacion` so the
// UI does not need a second round-trip per row.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const empleadoId = searchParams.get("empleado_id")
    const fechaDesde = searchParams.get("fecha_desde")
    const fechaHasta = searchParams.get("fecha_hasta")

    let query = supabase
      .from("dotaciones")
      .select(
        `
          *,
          empleados:empleado_id (
            id,
            nombre_completo,
            identificacion,
            empresa
          )
        `,
      )
      .order("fecha_entrega", { ascending: false })

    if (empleadoId) {
      query = query.eq("empleado_id", parseInt(empleadoId))
    }
    if (fechaDesde) {
      query = query.gte("fecha_entrega", fechaDesde)
    }
    if (fechaHasta) {
      query = query.lte("fecha_entrega", fechaHasta)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching dotaciones:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Flatten nested employee for easier UI consumption
    const flat = (data || []).map((row: any) => ({
      id: row.id,
      empleado_id: row.empleado_id,
      articulo_entregado: row.articulo_entregado,
      fecha_entrega: row.fecha_entrega,
      url_documento_firmado: row.url_documento_firmado || null,
      created_at: row.created_at,
      empleado_nombre: row.empleados?.nombre_completo || "",
      empleado_identificacion: row.empleados?.identificacion || "",
      empleado_empresa: row.empleados?.empresa || "",
    }))

    return NextResponse.json({ success: true, data: flat })
  } catch (e) {
    console.error("Error in dotaciones GET:", e)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST: create a new dotacion. Accepts optional `url_documento_firmado` with
// the public URL of the signed PDF previously uploaded via /api/rrhh/dotaciones/upload.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { empleado_id, articulo_entregado, fecha_entrega, url_documento_firmado } = body

    if (!empleado_id || !articulo_entregado || !fecha_entrega) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: empleado_id, articulo_entregado, fecha_entrega" },
        { status: 400 },
      )
    }

    const payload: Record<string, any> = {
      empleado_id,
      articulo_entregado,
      fecha_entrega,
    }
    if (url_documento_firmado && typeof url_documento_firmado === "string") {
      payload.url_documento_firmado = url_documento_firmado
    }

    const { data, error } = await supabase.from("dotaciones").insert(payload).select().single()

    if (error) {
      console.error("Error creating dotacion:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error("Error in dotaciones POST:", e)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
