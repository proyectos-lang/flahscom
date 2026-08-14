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

    // A reconnection candidate is a payment made once the customer had already
    // reached "Cortar" status. This MUST match exactly the Cortar rule of the
    // Cartera view v_cuota_vigente_detallada, which cuts when
    //   CURRENT_DATE >= fecha_vencimiento + interval '1 month'
    // (i.e. the 15th of the FOLLOWING month, inclusive). So a payment counts as
    // a reconnection when fecha_pago >= fecha_vencimiento + 1 calendar month.
    // A fixed "30 days" was wrong because months vary in length (due 15-jul + 30
    // days = 14-ago, a day short of the real 15-ago cut date).
    //
    // Dates are parsed as LOCAL calendar dates (not UTC) so the day is not
    // shifted by the Honduras UTC-6 offset.
    const parseLocal = (s: string) => {
      const [y, m, d] = s.split("T")[0].split("-").map(Number)
      return new Date(y, m - 1, d)
    }
    const reconexiones = (pagos || []).filter((pago: any) => {
      if (!pago.fecha_pago || !pago.fecha_vencimiento) return false
      const fechaVencimiento = parseLocal(pago.fecha_vencimiento)
      const fechaPago = parseLocal(pago.fecha_pago)
      const fechaCorte = new Date(fechaVencimiento)
      fechaCorte.setMonth(fechaCorte.getMonth() + 1) // el 15 del mes siguiente (día de corte)
      return fechaPago >= fechaCorte
    }).map((pago: any) => {
      const fechaVencimiento = parseLocal(pago.fecha_vencimiento)
      const fechaPago = parseLocal(pago.fecha_pago)
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
      const { error } = await supabase
        .from("plan_pagos")
        .update({ alerta_procesada: true })
        .eq("id", id)

      if (error) {
        console.error("[v0] Error updating plan_pagos:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: "Tipo de alerta invalido" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error processing alert:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
