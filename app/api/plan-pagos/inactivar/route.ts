import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Same password used elsewhere in the app for sensitive operations
// (deleting/resetting payments, editing montos, etc.)
const ADMIN_PASSWORD = process.env.PLAN_PAGOS_ADMIN_PASSWORD!

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { ids, comentario, password } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No se proporcionaron IDs de cuotas" }, { status: 400 })
    }

    // Require admin password to inactivate cuotas
    if (!password || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 })
    }

    console.log("[v0] IDs recibidos para inactivar:", ids)
    console.log("[v0] Comentario:", comentario)

    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0]
    console.log("[v0] Fecha de hoy:", today)

    // Build update object
    const updateData: Record<string, any> = {
      inactiva: "true",
      fecha_pago: today,
      updated_at: new Date().toISOString(),
    }
    if (comentario && typeof comentario === "string" && comentario.trim().length > 0) {
      updateData.comentario = comentario.trim()
    }

    // Update cuotas to set inactiva = "true" and fecha_pago = today
    // IDs are pre-filtered on frontend to only include unpaid cuotas
    const { data, error } = await supabase
      .from("plan_pagos")
      .update(updateData)
      .in("id", ids)
      .select()

    if (error) {
      console.error("[v0] Error inactivando cuotas:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Cuotas inactivadas:", data?.length || 0)
    return NextResponse.json({ success: true, count: data?.length || 0 })
  } catch (error: any) {
    console.error("[v0] Error in inactivar API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
