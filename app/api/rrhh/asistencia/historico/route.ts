import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fechaInicio = searchParams.get("fecha_inicio")
    const fechaFin = searchParams.get("fecha_fin")

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json({ 
        success: false, 
        error: "Fechas de inicio y fin son requeridas" 
      }, { status: 400 })
    }

    // Get asistencias with empleado info
    const { data, error } = await supabase
      .from("asistencias")
      .select(`
        id,
        fecha,
        hora_entrada,
        hora_salida,
        tipo,
        empleados (
          nombre_completo,
          identificacion,
          empresa
        )
      `)
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin)
      .order("fecha", { ascending: false })
      .order("hora_entrada", { ascending: true })

    if (error) {
      console.error("Error fetching historico:", error)
      throw error
    }

    return NextResponse.json({ 
      success: true, 
      data: data || []
    })
  } catch (error) {
    console.error("Error in historico API:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Error al cargar el historico de asistencias" 
    }, { status: 500 })
  }
}
