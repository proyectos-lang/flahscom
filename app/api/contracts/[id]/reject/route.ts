import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { observaciones_rechazo } = await request.json()

    console.log("[v0] Rejecting contract with ID:", id)

    // Update contract status to "rechazada" and add observations
    const { data: updatedContract, error: updateError } = await supabase
      .from("contratos")
      .update({
        estado_auditoria: "rechazada",
        observaciones_rechazo: observaciones_rechazo || "",
      })
      .eq("id", Number.parseInt(id))
      .select()
      .single()

    if (updateError) {
      console.error("[v0] Error rejecting contract:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log("[v0] Contract rejected successfully:", id)

    return NextResponse.json({
      success: true,
      message: "Contrato rechazado exitosamente",
      contract: updatedContract,
    })
  } catch (error) {
    console.error("[v0] Error in reject contract API:", error)
    return NextResponse.json(
      { error: "Error al rechazar el contrato" },
      { status: 500 }
    )
  }
}
