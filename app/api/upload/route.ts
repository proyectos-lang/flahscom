import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Admin client that bypasses RLS for storage operations
function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

export async function POST(request: NextRequest) {
  try {
    let formData
    try {
      formData = await request.formData()
    } catch (e) {
      return NextResponse.json({ error: "Invalid FormData" }, { status: 400 })
    }

    const file = formData.get("file")
    const type = formData.get("type")
    const instalacionId = formData.get("instalacionId")

    if (!file || !type || !instalacionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File must be a File object" }, { status: 400 })
    }

    const supabase = getAdminClient()

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const fileExt = file.name.split(".").pop() || "jpg"
    const fileName = `${instalacionId}_${type}_${Date.now()}.${fileExt}`
    const filePath = `instalaciones/${fileName}`

    const { error } = await supabase.storage
      .from("Archivos")
      .upload(filePath, arrayBuffer, {
        upsert: true,
        contentType: file.type || "image/jpeg",
      })

    if (error) {
      console.error("[v0] Supabase upload error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from("Archivos")
      .getPublicUrl(filePath)

    return NextResponse.json({ success: true, url: urlData.publicUrl })
  } catch (error: any) {
    console.error("[v0] Upload endpoint error:", error)
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 })
  }
}
