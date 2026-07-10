import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("evaluaciones")
      .select("*")
      .order("fecha_evaluacion", { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error("Error fetching evaluaciones:", error)
    return NextResponse.json({ success: false, error: "Error al cargar evaluaciones" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from("evaluaciones")
      .insert([{
        empleado_id: body.empleado_id,
        evaluador: body.evaluador,
        fecha_evaluacion: new Date().toISOString().split("T")[0],
        periodo: body.periodo,
        puntaje_total: body.puntaje_total,
        calificacion: body.calificacion,
        productividad: body.productividad,
        puntualidad: body.puntualidad,
        trabajo_equipo: body.trabajo_equipo,
        comunicacion: body.comunicacion,
        iniciativa: body.iniciativa,
        comentarios: body.comentarios,
        estado: "pendiente",
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error creating evaluacion:", error)
    return NextResponse.json({ success: false, error: "Error al crear evaluacion" }, { status: 500 })
  }
}
