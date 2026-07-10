import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(
  request: Request,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    // Handle both sync and async params (Vercel compatibility)
    const params = context.params instanceof Promise ? await context.params : context.params
    const idString = params?.id || ""
    
    if (!idString) {
      console.log("[v0] No ID provided in params:", context.params)
      return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 })
    }
    
    const id = Number.parseInt(idString, 10)
    
    if (isNaN(id) || id <= 0) {
      console.log("[v0] Invalid ID provided:", idString, "parsed as:", id)
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }
    
    console.log("[v0] Starting payment registration for id:", id)
    
    const formData = await request.formData()
    const file = formData.get("comprobante") as File
    const referencia = formData.get("referencia") as string
    // Voucher/receipt date (YYYY-MM-DD) for the new pagoreferencia column.
    const pagoreferencia = formData.get("pagoreferencia") as string
    const usuariopago = formData.get("usuariopago") as string

    if (!file) {
      console.log("[v0] No file provided")
      return NextResponse.json({ error: "No se proporcionó comprobante" }, { status: 400 })
    }

    console.log("[v0] File received:", file.name, "Size:", file.size)

    // Upload file to Supabase Storage
    const fileName = `comprobante-${id}-${Date.now()}.${file.name.split(".").pop()}`
    const fileBuffer = await file.arrayBuffer()

    console.log("[v0] Uploading file to storage:", fileName)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("Archivos")
      .upload(`archivos/${fileName}`, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("[v0] Error uploading file:", uploadError)
      return NextResponse.json({ error: `Error al subir archivo: ${uploadError.message}` }, { status: 500 })
    }

    console.log("[v0] File uploaded successfully")

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("Archivos").getPublicUrl(`archivos/${fileName}`)

    console.log("[v0] Public URL generated:", publicUrl)

    // Get current date/time in Honduras timezone (America/Tegucigalpa, CST -6).
    // sv-SE locale yields the ISO-like "YYYY-MM-DD HH:mm:ss" shape that we
    // can safely split into the date / time parts that the DB expects.
    const hondurasDate = new Date().toLocaleString("sv-SE", { timeZone: "America/Tegucigalpa" })
    const [fechaPago, horaPagoRaw] = hondurasDate.split(" ")
    // plan_pagos.horapago is a TIME column, so we must store HH:mm:ss (no
    // timezone, no date). Honduras has no DST so the offset is always -06:00.
    const horaPago = horaPagoRaw // already "HH:mm:ss"
    const updatedAt = new Date(hondurasDate).toISOString() // Full timestamp

    console.log("[v0] Honduras date - Payment:", fechaPago, "Hora:", horaPago, "Updated at:", updatedAt)

    // Update plan_pagos record
    console.log("[v0] Updating plan_pagos record with id:", id)
    
    const { data, error } = await supabase
      .from("plan_pagos")
      .update({
        comprobante: publicUrl,
        fecha_pago: fechaPago,
        horapago: horaPago,
        pagado: true,
        referencia: referencia || null,
        pagoreferencia: pagoreferencia || null,
        usuariopago: usuariopago || null,
        updated_at: updatedAt,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating plan_pagos:", error)
      return NextResponse.json({ error: `Error al actualizar pago: ${error.message}` }, { status: 500 })
    }

    console.log("[v0] Payment registered successfully")
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[v0] Error registering payment:", error)
    return NextResponse.json({ error: `Error: ${error.message}` }, { status: 500 })
  }
}
