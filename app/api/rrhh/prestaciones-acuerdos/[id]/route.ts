import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Return an agreement + its full payment plan (cuotas ordered by numero_cuota)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const acuerdoId = Number(id)

    // Avoid PostgREST embedded join (PGRST200 on missing FK hint); load
    // the empleado record manually.
    const { data: acuerdo, error: acuerdoError } = await supabase
      .from("prestaciones_acuerdos")
      .select("*")
      .eq("id", acuerdoId)
      .single()

    if (acuerdoError) throw acuerdoError

    let empleado: any = null
    if (acuerdo?.empleado_id) {
      const { data: emp, error: empErr } = await supabase
        .from("empleados")
        .select("id, nombre_completo, identificacion, empresa, activo")
        .eq("id", acuerdo.empleado_id)
        .maybeSingle()
      if (empErr) throw empErr
      empleado = emp
    }

    const { data: pagos, error: pagosError } = await supabase
      .from("prestaciones_pagos")
      .select("*")
      .eq("acuerdo_id", acuerdoId)
      .order("numero_cuota", { ascending: true })

    if (pagosError) throw pagosError

    const acuerdoWithEmpleado = { ...acuerdo, empleados: empleado }
    return NextResponse.json({
      success: true,
      data: { acuerdo: acuerdoWithEmpleado, pagos: pagos || [] },
    })
  } catch (err: any) {
    console.error("[v0] Error GET prestaciones-acuerdo:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
