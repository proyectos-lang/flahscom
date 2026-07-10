import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"

/**
 * Updates the package of the master contract. IMPORTANT: this endpoint
 * intentionally does NOT touch any price field (valor_mensual / valor_paquete)
 * — the client's monthly price must stay exactly as it was. It only changes
 * the package on the contratos table.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { contrato_id, paquete, paquete_id } = await request.json()

    if (!contrato_id || !paquete) {
      return NextResponse.json(
        { success: false, error: "contrato_id y paquete son requeridos" },
        { status: 400 },
      )
    }

    const supabase = await getSupabaseServerClient()

    // The contratos table identifies the package by BOTH paquete_id and
    // nombre_paquete, so we update both (price fields are left untouched).
    const contratoUpdate: Record<string, unknown> = { nombre_paquete: paquete }
    if (paquete_id != null) {
      contratoUpdate.paquete_id = paquete_id
    }

    const { error } = await supabase.from("contratos").update(contratoUpdate).eq("id", contrato_id)

    if (error) {
      console.error("[v0] Error updating paquete:", error)
      return NextResponse.json(
        { success: false, error: error.message || "Error al actualizar" },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in PATCH paquete:", error)
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 })
  }
}
