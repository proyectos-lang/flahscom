import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const contractId = Number.parseInt(id)

    console.log("[v0] Deleting contract with ID:", contractId)

    const { data: contract, error: contractError } = await supabase
      .from("contratos")
      .select("cliente_id")
      .eq("id", contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 })
    }

    const clienteId = contract.cliente_id

    const { error: planPagosError } = await supabase.from("plan_pagos").delete().eq("contrato_id", contractId)

    if (planPagosError) {
      console.error("Error deleting plan_pagos:", planPagosError)
      return NextResponse.json({ error: "Error al eliminar el plan de pagos" }, { status: 500 })
    }

    const { error: contratoError } = await supabase.from("contratos").delete().eq("id", contractId)

    if (contratoError) {
      console.error("Error deleting contrato:", contratoError)
      return NextResponse.json({ error: "Error al eliminar el contrato" }, { status: 500 })
    }

    const { error: clienteError } = await supabase.from("clientes").delete().eq("id", clienteId)

    if (clienteError) {
      console.error("Error deleting cliente:", clienteError)
      return NextResponse.json({ error: "Error al eliminar el cliente" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Contrato, cliente y plan de pagos eliminados exitosamente",
    })
  } catch (error) {
    console.error("[v0] Error deleting contract:", error)
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 })
  }
}
