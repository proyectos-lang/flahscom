import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const contratoId = searchParams.get("contrato_id")

    let query = supabase.from("plan_pagos").select("*").order("numero_cuota", { ascending: true })

    if (contratoId) {
      query = query.eq("contrato_id", Number.parseInt(contratoId))
    }

    const { data: pagos, error } = await query

    if (error) {
      console.error("[v0] Error loading payment history:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Payment history loaded:", pagos?.length || 0)
    return NextResponse.json(pagos || [])
  } catch (error: any) {
    console.error("[v0] Error in payment history API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
