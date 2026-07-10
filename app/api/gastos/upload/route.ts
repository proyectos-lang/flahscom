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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Archivo invalido" }, { status: 400 })
    }

    const supabase = getAdminClient()
    const arrayBuffer = await file.arrayBuffer()
    const fileExt = file.name.split(".").pop() || "bin"
    const fileName = `comprobante_${Date.now()}.${fileExt}`
    const filePath = `gastos/${fileName}`

    const { error } = await supabase.storage.from("Archivos").upload(filePath, arrayBuffer, {
      upsert: true,
      contentType: file.type || "application/octet-stream",
    })

    if (error) {
      console.error("[v0] Gastos upload error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from("Archivos").getPublicUrl(filePath)
    return NextResponse.json({ success: true, url: urlData.publicUrl })
  } catch (error: any) {
    console.error("[v0] Gastos upload endpoint error:", error)
    return NextResponse.json({ error: error.message || "Upload fallo" }, { status: 500 })
  }
}
