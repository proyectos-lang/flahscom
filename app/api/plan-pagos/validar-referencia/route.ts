import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const referencia = searchParams.get("referencia")

    if (!referencia || !referencia.trim()) {
      return NextResponse.json({ error: "Referencia es requerida" }, { status: 400 })
    }

    console.log("[v0] Validating reference:", referencia.trim())

    // Search for existing payments with this reference
    const { data, error } = await supabase
      .from("plan_pagos")
      .select("id, contrato_id, numero_cuota, fecha_pago, referencia")
      .eq("referencia", referencia.trim())

    if (error) {
      console.error("[v0] Supabase error validating reference:", error.message, error.code, error.details)
      return NextResponse.json({ error: "Error al validar referencia: " + error.message }, { status: 500 })
    }

    console.log("[v0] Reference validation result:", data?.length || 0, "matches found")

    const count = data?.length || 0
    const duplicates = (data || []).map((item) => ({
      contrato_id: item.contrato_id,
      numero_cuota: item.numero_cuota,
      fecha_pago: item.fecha_pago || "N/A",
    }))

    return NextResponse.json({
      success: true,
      count,
      duplicates,
      message: count > 0 
        ? `Referencia encontrada en ${count} pago(s)` 
        : "Referencia disponible",
    })
  } catch (error) {
    console.error("Error in reference validation:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
