import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { ids, password } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No se proporcionaron IDs de pagos" }, { status: 400 })
    }

    // Verify password
    if (password !== process.env.PLAN_PAGOS_ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Contrasena incorrecta" }, { status: 401 })
    }

    // Update all selected payments
    const { data, error } = await supabase
      .from("plan_pagos")
      .update({
        confirmado: "si",
        updated_at: new Date().toISOString(),
      })
      .in("id", ids)
      .select()

    if (error) {
      console.error("Error confirming payments:", error)
      throw error
    }

    return NextResponse.json({ 
      success: true, 
      count: data?.length || 0,
      message: `${data?.length || 0} pagos confirmados correctamente`
    })
  } catch (error: any) {
    console.error("Error in bulk confirmation:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
