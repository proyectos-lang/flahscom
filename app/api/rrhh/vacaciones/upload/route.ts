import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

// Uploads a signed vacation request document (PDF/image) to the documentos_rrhh
// bucket and returns its public URL. The caller then persists that URL into
// vacaciones.url_documento_firmado via the PUT endpoint.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    const vacacionId = formData.get("vacacion_id")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Archivo invalido" }, { status: 400 })
    }

    // Size guard (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "El archivo excede el tamano maximo permitido (10 MB)" },
        { status: 400 },
      )
    }

    const supabase = getAdminClient()
    const arrayBuffer = await file.arrayBuffer()
    const fileExt = (file.name.split(".").pop() || "pdf").toLowerCase()
    const timestamp = Date.now()
    const vacPart = vacacionId ? `vac${vacacionId}_` : ""
    const fileName = `vacaciones_${vacPart}${timestamp}.${fileExt}`
    const filePath = `vacaciones/${fileName}`

    const { error } = await supabase.storage
      .from("documentos_rrhh")
      .upload(filePath, arrayBuffer, {
        upsert: true,
        contentType: file.type || "application/pdf",
      })

    if (error) {
      console.error("[v0] Vacaciones upload error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from("documentos_rrhh")
      .getPublicUrl(filePath)

    return NextResponse.json({ success: true, url: urlData.publicUrl })
  } catch (error: any) {
    console.error("[v0] Vacaciones upload endpoint error:", error)
    return NextResponse.json({ error: error.message || "Upload fallo" }, { status: 500 })
  }
}
