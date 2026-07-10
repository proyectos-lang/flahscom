import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const referencia: string = body.referencia || ""

    console.log("[v0] Approving contract with ID:", id, "| Referencia:", referencia)

    const { data: contrato, error: contractError } = await supabase
      .from("contratos")
      .select("*")
      .eq("id", Number.parseInt(id))
      .single()

    if (contractError || !contrato) {
      console.error("[v0] Error fetching contract:", contractError?.message || "Contract not found")
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    // Get client information if cliente_id exists
    let clienteNombre = "Sin nombre"
    if (contrato.cliente_id) {
      const { data: cliente } = await supabase
        .from("clientes")
        .select("nombre_completo")
        .eq("id", contrato.cliente_id)
        .single()

      if (cliente) {
        clienteNombre = cliente.nombre_completo
      }
    }

    let precioMensual = contrato.valor_paquete || 0

    if (contrato.paquete_id) {
      const { data: paquete } = await supabase
        .from("paquetes")
        .select("precio_mensual")
        .eq("id", contrato.paquete_id)
        .single()

      if (paquete) {
        precioMensual = paquete.precio_mensual
      }
    }

    console.log("[v0] Contract data:", contrato)
    console.log("[v0] Monthly price:", precioMensual)

    // Update contract status to approved
    const { data, error } = await supabase
      .from("contratos")
      .update({ estado_auditoria: "aprobada" })
      .eq("id", Number.parseInt(id))
      .select()

    if (error) {
      console.error("[v0] Error approving contract:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const contratoFecha = new Date(contrato.fecha_contratacion)
    const diaDelMes = contratoFecha.getDate()

    let costoSimbolico = 0

    if (diaDelMes >= 16 && diaDelMes <= 21) {
      costoSimbolico = 200
    } else if (diaDelMes >= 22 && diaDelMes <= 26) {
      costoSimbolico = 130
    }

    // First payment is always monthly fee + symbolic cost
    const primerMonto = precioMensual + costoSimbolico

    console.log(
      "[v0] Payment plan logic: symbolic cost =",
      costoSimbolico,
      "| First payment: cuota 1",
      costoSimbolico > 0 ? "= symbolic cost, cuota 2 = monthly fee" : "= monthly fee",
      "| Payments marked as done:",
      costoSimbolico > 0 ? "cuota 1 & 2" : "cuota 1",
    )

    const planPagos = []
    const fechaAprobacion = new Date().toISOString().split("T")[0]
    const mesActual = new Date().getMonth()
    const anioActual = new Date().getFullYear()
    
    for (let i = 1; i <= 12; i++) {
      // Calculate payment date starting from current month (15th)
      const fechaVencimiento = new Date(anioActual, mesActual + i - 1, 15)

      let montoCuota: number
      let marcadoPagado: boolean
      let marcadoConfirmado: string | null
      let fechaPago: string | null

      if (costoSimbolico > 0) {
        // If symbolic cost > 0
        if (i === 1) {
          // First payment: symbolic cost only
          montoCuota = costoSimbolico
          marcadoPagado = true
          marcadoConfirmado = "si"
          fechaPago = fechaAprobacion
        } else if (i === 2) {
          // Second payment: monthly fee, marked as paid
          montoCuota = precioMensual
          marcadoPagado = true
          marcadoConfirmado = "si"
          fechaPago = fechaAprobacion
        } else {
          // Remaining payments: monthly fee, not paid
          montoCuota = precioMensual
          marcadoPagado = false
          marcadoConfirmado = null
          fechaPago = null
        }
      } else {
        // If symbolic cost = 0
        if (i === 1) {
          // First payment: monthly fee, marked as paid
          montoCuota = precioMensual
          marcadoPagado = true
          marcadoConfirmado = "si"
          fechaPago = fechaAprobacion
        } else {
          // Remaining payments: monthly fee, not paid
          montoCuota = precioMensual
          marcadoPagado = false
          marcadoConfirmado = null
          fechaPago = null
        }
      }

      planPagos.push({
        contrato_id: Number.parseInt(id),
        numero_cuota: i,
        fecha_vencimiento: fechaVencimiento.toISOString().split("T")[0],
        monto_esperado: montoCuota,
        pagado: marcadoPagado,
        confirmado: marcadoConfirmado,
        fecha_pago: fechaPago,
        cliente: clienteNombre,
        referencia: marcadoPagado && referencia ? referencia : null,
      })
    }

    // Delete existing payment plan for this contract to prevent duplicates
    const { error: deleteError } = await supabase
      .from("plan_pagos")
      .delete()
      .eq("contrato_id", Number.parseInt(id))

    if (deleteError) {
      console.warn("[v0] Error deleting existing payment plan:", deleteError)
    } else {
      console.log("[v0] Deleted existing payment plan (if any) for contract:", id)
    }

    // Insert payment plan into database
    const { error: planError } = await supabase.from("plan_pagos").insert(planPagos)

    if (planError) {
      console.error("[v0] Error creating payment plan:", planError)
      // Don't fail the approval if payment plan creation fails
      console.warn("[v0] Contract approved but payment plan creation failed")
    } else {
      console.log("[v0] Payment plan created successfully with 12 installments")
    }

    console.log("[v0] Contract approved successfully:", data)
    return NextResponse.json({ success: true, data, paymentPlan: planPagos })
  } catch (error) {
    console.error("[v0] Error in approve endpoint:", error)
    return NextResponse.json({ error: "Failed to approve contract" }, { status: 500 })
  }
}
