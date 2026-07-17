import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()

    // Fetch pending reconnection alerts (alerta_procesada = false, pagado = true)
    // We'll filter by date difference in the response
    const { data: pagos, error: pagosError } = await supabase
      .from("plan_pagos")
      .select(`
        id,
        contrato_id,
        cliente,
        fecha_vencimiento,
        fecha_pago,
        horapago,
        monto_esperado,
        numero_cuota,
        contratos (
          id,
          clientes (
            colonia,
            direccion
          )
        )
      `)
      .eq("alerta_procesada", false)
      .eq("pagado", true)
      .not("fecha_pago", "is", null)
      .order("fecha_pago", { ascending: false })

    if (pagosError) {
      console.error("[v0] Error fetching pagos alerts:", pagosError)
    }

    // Filter pagos where fecha_pago - fecha_vencimiento >= 30 days
    // (30 days exactly is included as a reconnection candidate).
    const reconexiones = (pagos || []).filter((pago: any) => {
      if (!pago.fecha_pago || !pago.fecha_vencimiento) return false
      const fechaPago = new Date(pago.fecha_pago)
      const fechaVencimiento = new Date(pago.fecha_vencimiento)
      const diffDays = Math.floor((fechaPago.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays >= 30
    }).map((pago: any) => {
      const fechaPago = new Date(pago.fecha_pago)
      const fechaVencimiento = new Date(pago.fecha_vencimiento)
      const diasRetraso = Math.floor((fechaPago.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24))
      const clienteData = pago.contratos?.clientes
      const colonia = clienteData?.colonia || clienteData?.direccion || null
      return { ...pago, dias_retraso: diasRetraso, colonia }
    })

    return NextResponse.json({
      success: true,
      reconexiones: reconexiones,
      total_reconexiones: reconexiones.length,
    })
  } catch (error: any) {
    console.error("[v0] Error in alertas API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Process alerts (mark as processed)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { tipo, id } = body

    const supabase = await getSupabaseServerClient()

    if (tipo === "reconexion") {
      // Read the current payment state to decide whether this cuota's payment is
      // still pending confirmation (pagado = true, confirmado != "si"). If so,
      // enabling the reconnection also auto-approves that payment in one step.
      const { data: current, error: readError } = await supabase
        .from("plan_pagos")
        .select("pagado, confirmado")
        .eq("id", id)
        .single()

      if (readError) {
        console.error("[v0] Error reading plan_pagos:", readError)
        return NextResponse.json({ error: readError.message }, { status: 500 })
      }

      const estabaPendiente = current?.pagado === true && current?.confirmado !== "si"

      const updatePayload: Record<string, any> = { alerta_procesada: true }
      if (estabaPendiente) {
        updatePayload.confirmado = "si"
        updatePayload.updated_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from("plan_pagos")
        .update(updatePayload)
        .eq("id", id)

      if (error) {
        console.error("[v0] Error updating plan_pagos:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, pagoAprobado: estabaPendiente })
    } else {
      return NextResponse.json({ error: "Tipo de alerta invalido" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("[v0] Error processing alert:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
