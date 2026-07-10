import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    const folder = formData.get("folder") as string || "rrhh/documentos"

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const fileExt = file.name.split(".").pop() || "pdf"
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const fileName = `${timestamp}_${randomStr}.${fileExt}`
    const filePath = `${folder}/${fileName}`

    const { error } = await supabase.storage
      .from("Archivos")
      .upload(filePath, arrayBuffer, {
        upsert: true,
        contentType: file.type || "application/pdf",
      })

    if (error) {
      console.error("Supabase upload error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from("Archivos")
      .getPublicUrl(filePath)

    return NextResponse.json({ success: true, url: urlData.publicUrl })
  } catch (error: any) {
    console.error("RRHH Upload error:", error)
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 })
  }
}
