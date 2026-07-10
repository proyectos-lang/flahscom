import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { estado, url_firma_aprobador } = body

    const updateData: Record<string, unknown> = { estado }

    if (estado === "aprobada") {
      updateData.fecha_aprobacion = new Date().toISOString().split("T")[0]
      if (url_firma_aprobador) {
        updateData.url_firma_aprobador = url_firma_aprobador
      }
    }

    const { data, error } = await supabase
      .from("adelantos_nomina")
      .update(updateData)
      .eq("id", parseInt(id))
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error updating adelanto:", error)
    return NextResponse.json({ error: "Error al actualizar adelanto" }, { status: 500 })
  }
}
