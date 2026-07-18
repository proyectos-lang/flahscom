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
      console.log("[v0] No ID provided in params")
      return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 })
    }
    
    const id = Number.parseInt(idString, 10)
    
    if (isNaN(id) || id <= 0) {
      console.log("[v0] Invalid ID provided:", idString, "parsed as:", id)
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }
    
    console.log("[v0] Starting payment confirmation for id:", id)
    
    const body = await request.json()
    const { password, usuarioConfirma } = body

    // Verify password
    if (password !== process.env.PLAN_PAGOS_ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 })
    }

    console.log("[v0] Password verified, updating payment confirmation")

    // Update plan_pagos record. usuarioconfirma records WHO approved the payment
    // (mirrors usuariopago, which records who registered it).
    const { data, error } = await supabase
      .from("plan_pagos")
      .update({
        confirmado: "si",
        usuarioconfirma: usuarioConfirma || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating payment:", error)
      throw error
    }

    console.log("[v0] Payment confirmed successfully")
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[v0] Error confirming payment:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
