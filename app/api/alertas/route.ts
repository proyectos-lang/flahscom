import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"

// Number of days late a payment must be to count as a reconnection candidate.
const RECONEXION_DIAS_MINIMOS = 30

function diffDias(fechaPago: string, fechaVencimiento: string): number {
  const fp = new Date(fechaPago).getTime()
  const fv = new Date(fechaVencimiento).getTime()
  return Math.floor((fp - fv) / (1000 * 60 * 60 * 24))
}

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()

    // Fetch ALL paid, unprocessed installments that have a payment date.
    // PostgREST caps a single response at 1000 rows, so we page through the
    // full set with .range() instead of silently truncating (which was hiding
    // reconnection alerts beyond the first 1000 rows). Only the light columns
    // needed to decide candidates are pulled here; the heavier cliente
    // enrichment runs afterwards on the small candidate set only.
    const pageSize = 1000
    let from = 0
    const pagos: any[] = []
    while (true) {
      const { data, error } = await supabase
        .from("plan_pagos")
        .select("id, contrato_id, cliente, fecha_vencimiento, fecha_pago, horapago, monto_esperado, numero_cuota")
        .eq("alerta_procesada", false)
        .eq("pagado", true)
        .not("fecha_pago", "is", null)
        .order("fecha_pago", { ascending: false })
        .range(from, from + pageSize - 1)

      if (error) {
        console.error("[v0] Error fetching pagos alerts:", error)
        break
      }
      if (!data || data.length === 0) break
      pagos.push(...data)
      if (data.length < pageSize) break
      from += pageSize
    }

    // Keep only installments paid RECONEXION_DIAS_MINIMOS+ days after their due
    // date (exactly 30 days is included as a reconnection candidate).
    const candidatos = pagos.filter(
      (pago: any) =>
        pago.fecha_pago &&
        pago.fecha_vencimiento &&
        diffDias(pago.fecha_pago, pago.fecha_vencimiento) >= RECONEXION_DIAS_MINIMOS,
    )

    // Enrich only the candidates with colonia/direccion (contratos -> clientes).
    const contratoIds = Array.from(
      new Set(candidatos.map((p: any) => p.contrato_id).filter(Boolean)),
    ) as number[]

    const coloniaByContrato: Record<number, string | null> = {}
    if (contratoIds.length > 0) {
      const { data: contratos, error: contratosError } = await supabase
        .from("contratos")
        .select("id, clientes ( colonia, direccion )")
        .in("id", contratoIds)
      if (contratosError) {
        console.error("[v0] Error enriching alertas with cliente:", contratosError)
      }
      for (const con of contratos || []) {
        const cli = (con as any).clientes
        coloniaByContrato[(con as any).id] = cli?.colonia || cli?.direccion || null
      }
    }

    const reconexiones = candidatos.map((pago: any) => ({
      ...pago,
      dias_retraso: diffDias(pago.fecha_pago, pago.fecha_vencimiento),
      colonia: coloniaByContrato[pago.contrato_id] ?? null,
    }))

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
