import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const empleadoId = searchParams.get("empleado_id")
    const fechaInicio = searchParams.get("fecha_inicio")
    const fechaFin = searchParams.get("fecha_fin")
    const limit = parseInt(searchParams.get("limit") || "50")

    // Date range query for liquidation (includes concepto for PDF detail)
    if (fechaInicio && fechaFin) {
      const { data, error } = await supabase
        .from("deducciones")
        .select("empleado_id, monto, concepto")
        .gte("fecha_aplicacion", fechaInicio)
        .lte("fecha_aplicacion", fechaFin)

      if (error) throw error
      return NextResponse.json({ success: true, data: data || [] })
    }

    let query = supabase
      .from("deducciones")
      .select("*")
      .order("fecha_aplicacion", { ascending: false })
      .limit(limit)

    if (empleadoId) {
      query = query.eq("empleado_id", empleadoId)
    }

    const { data, error } = await query

    if (error) throw error

    // Get employee names for the deductions
    const empleadoIds = [...new Set((data || []).map(d => d.empleado_id).filter(Boolean))]
    
    let empleadosMap: Record<number, string> = {}
    if (empleadoIds.length > 0) {
      const { data: empleados } = await supabase
        .from("empleados")
        .select("id, nombre_completo")
        .in("id", empleadoIds)
      
      empleadosMap = (empleados || []).reduce((acc, emp) => {
        acc[emp.id] = emp.nombre_completo
        return acc
      }, {} as Record<number, string>)
    }

    const deduccionesConNombre = (data || []).map(d => ({
      ...d,
      empleado_nombre: empleadosMap[d.empleado_id] || "Desconocido"
    }))

    return NextResponse.json({ success: true, data: deduccionesConNombre })
  } catch (error) {
    console.error("Error fetching deducciones:", error)
    return NextResponse.json({ error: "Error al cargar deducciones" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { empleado_id, concepto, monto, fecha_aplicacion } = body

    if (!empleado_id || !concepto || !monto || !fecha_aplicacion) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("deducciones")
      .insert({
        empleado_id,
        concepto,
        monto: parseFloat(monto),
        fecha_aplicacion,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error creating deduccion:", error)
    return NextResponse.json({ error: "Error al registrar deduccion" }, { status: 500 })
  }
}
