import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()

    // Update the installation status to "instalado"
    const { error } = await supabase
      .from("contratos")
      .update({ estatusinstalacion: "instalado" })
      .eq("id", Number.parseInt(id))

    if (error) {
      console.error("[v0] Error updating installation status:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in marcar-instalado API:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
