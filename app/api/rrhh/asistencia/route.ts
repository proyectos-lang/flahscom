import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get("fecha")
    const fechaInicio = searchParams.get("fecha_inicio")
    const fechaFin = searchParams.get("fecha_fin")

    // Support date range query for liquidation calculation
    if (fechaInicio && fechaFin) {
      const { data: asistencias, error: asistError } = await supabase
        .from("asistencias")
        .select("empleado_id, tipo")
        .gte("fecha", fechaInicio)
        .lte("fecha", fechaFin)

      if (asistError) throw asistError

      return NextResponse.json({ 
        success: true, 
        data: asistencias || []
      })
    }

    // Single date query for attendance page
    if (!fecha) {
      return NextResponse.json({ success: false, error: "Fecha requerida" }, { status: 400 })
    }

    // Get all active employees
    const { data: empleados, error: empError } = await supabase
      .from("empleados")
      .select("id, identificacion, nombre_completo, empresa")
      .eq("activo", true)
      .order("nombre_completo", { ascending: true })

    if (empError) throw empError

    // Get asistencias for the date
    const { data: asistencias, error: asistError } = await supabase
      .from("asistencias")
      .select("id, empleado_id, fecha, hora_entrada, tipo")
      .eq("fecha", fecha)

    if (asistError) throw asistError

    return NextResponse.json({ 
      success: true, 
      empleados: empleados || [],
      asistencias: asistencias || []
    })
  } catch (error) {
    console.error("Error fetching asistencias:", error)
    return NextResponse.json({ success: false, error: "Error al cargar asistencias" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { identificacion, fecha, hora_entrada, tipo } = body

    // Find employee by identificacion
    const { data: empleado, error: empError } = await supabase
      .from("empleados")
      .select("id, nombre_completo")
      .eq("identificacion", identificacion)
      .single()

    if (empError || !empleado) {
      return NextResponse.json({ 
        success: false, 
        error: "Empleado no encontrado" 
      }, { status: 404 })
    }

    // UPSERT: Check if record exists for this employee on this date
    const { data: existing } = await supabase
      .from("asistencias")
      .select("id")
      .eq("empleado_id", empleado.id)
      .eq("fecha", fecha)
      .maybeSingle()

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from("asistencias")
        .update({ hora_entrada, tipo })
        .eq("id", existing.id)
      if (error) throw error
    } else {
      // Insert new record
      const { error } = await supabase
        .from("asistencias")
        .insert([{ 
          empleado_id: empleado.id, 
          fecha, 
          hora_entrada, 
          tipo 
        }])
      if (error) throw error
    }

    return NextResponse.json({ 
      success: true,
      empleado: {
        id: empleado.id,
        nombre_completo: empleado.nombre_completo
      }
    })
  } catch (error) {
    console.error("Error registering asistencia:", error)
    return NextResponse.json({ success: false, error: "Error al registrar asistencia" }, { status: 500 })
  }
}
