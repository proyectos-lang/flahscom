import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Bulk update the monthly amount for all UNPAID cuotas of a contract.
// Mirrors the admin-password convention used across the app for sensitive
// operations (deleting payments, inactivating cuotas, editing montos, etc.).
const ADMIN_PASSWORD = process.env.PLAN_PAGOS_ADMIN_PASSWORD!

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { contrato_id, monto, password } = body

    if (!contrato_id) {
      return NextResponse.json({ error: "Falta contrato_id" }, { status: 400 })
    }
    const montoNum = Number(monto)
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      return NextResponse.json({ error: "Monto invalido" }, { status: 400 })
    }
    if (!password || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 })
    }

    // Two-step update: first read the unpaid cuota IDs, then update by id list.
    // We avoid `.or("pagado.is.null,pagado.eq.false")` because the combined
    // is-null + eq syntax has surfaced PGRST/schema-cache "column does not
    // exist" errors in some Supabase deployments. Filtering in JS over the
    // boolean (treating null as unpaid) is fully equivalent and rock solid.
    const { data: candidates, error: selError } = await supabase
      .from("plan_pagos")
      .select("id, pagado")
      .eq("contrato_id", contrato_id)

    if (selError) {
      console.error("[v0] Error leyendo cuotas para actualizar:", selError)
      return NextResponse.json({ error: selError.message }, { status: 500 })
    }

    const idsToUpdate = (candidates || [])
      .filter((c: any) => c.pagado !== true) // unpaid: false OR null
      .map((c: any) => c.id)

    if (idsToUpdate.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    const { data, error } = await supabase
      .from("plan_pagos")
      .update({ monto_esperado: montoNum, updated_at: new Date().toISOString() })
      .in("id", idsToUpdate)
      .select("id")

    if (error) {
      console.error("[v0] Error actualizando monto mensual:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: data?.length || 0 })
  } catch (err: any) {
    console.error("[v0] Error en cambiar-monto:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
