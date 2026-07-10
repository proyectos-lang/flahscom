import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Create nomina master record and period entries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      periodo,
      descripcion,
      fecha_inicio, 
      fecha_fin, 
      total_bruto, 
      total_deducciones, 
      total_neto, 
      empleados 
    } = body

    if (!fecha_inicio || !fecha_fin || !empleados || !Array.isArray(empleados)) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    // Step 1: Create master record in nominas table
    const { data: nominaData, error: nominaError } = await supabase
      .from("nominas")
      .insert({
        periodo: periodo || `${fecha_inicio} - ${fecha_fin}`,
        descripcion: descripcion || "Periodo de Nomina",
        fecha_inicio,
        fecha_fin,
        total_bruto: total_bruto || 0,
        total_deducciones: total_deducciones || 0,
        total_neto: total_neto || 0,
        estado: "borrador",
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (nominaError) {
      console.error("Error creating nomina:", nominaError)
      return NextResponse.json({ error: nominaError.message }, { status: 500 })
    }

    const nominaId = nominaData.id

    // Step 2: Insert period entries for each employee in periodos_nomina
    const records = empleados.map((emp: { 
      empleado_id: number
      dias_laborados: number
      salario_devengado: number
      viaticos: number
      total_deducciones: number
      neto_pagado: number
    }) => ({
      nomina_id: nominaId,
      empleado_id: emp.empleado_id,
      fecha_inicio,
      fecha_fin,
      dias_laborados: emp.dias_laborados,
      salario_devengado: emp.salario_devengado || 0,
      viaticos: emp.viaticos || 0,
      total_deducciones: emp.total_deducciones || 0,
      neto_pagado: emp.neto_pagado || 0,
    }))

    const { data: periodosData, error: periodosError } = await supabase
      .from("periodos_nomina")
      .insert(records)
      .select()

    if (periodosError) {
      console.error("Error creating periodos:", periodosError)
      // Rollback: delete the nomina if periodos failed
      await supabase.from("nominas").delete().eq("id", nominaId)
      return NextResponse.json({ error: periodosError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        nomina: nominaData,
        periodos: periodosData
      }
    })
  } catch (error) {
    console.error("Error in liquidation POST:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
