import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Mark a single cuota as paid, optionally attach a receipt URL.
// If all cuotas of the parent agreement are now paid, auto-close the agreement.
// Response includes `finalizado: true` plus the employee name when that happens
// so the UI can show a celebration toast.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pagoId = Number(id)
    const body = await req.json().catch(() => ({}))
    const { url_comprobante, fecha_pago } = body

    const hoy = fecha_pago || new Date().toISOString().slice(0, 10)

    // 1. Update cuota. The canonical prestaciones_pagos schema only has
    // estado, fecha_pago and url_comprobante for tracking the payment —
    // no `notas` or `updated_at` columns.
    const { data: updated, error: updateError } = await supabase
      .from("prestaciones_pagos")
      .update({
        estado: "Pagado",
        fecha_pago: hoy,
        url_comprobante: url_comprobante || null,
      })
      .eq("id", pagoId)
      .select()
      .single()

    if (updateError) throw updateError

    const acuerdoId = updated.acuerdo_id

    // 2. Check if ALL cuotas are now paid
    const { data: allPagos, error: pagosError } = await supabase
      .from("prestaciones_pagos")
      .select("estado")
      .eq("acuerdo_id", acuerdoId)

    if (pagosError) throw pagosError

    const allPaid = (allPagos || []).length > 0 && allPagos.every((p: any) => p.estado === "Pagado")

    let empleadoNombre: string | null = null
    if (allPaid) {
      // 3. Auto-finalize the master agreement
      const { data: acuerdoActualizado, error: finalizeError } = await supabase
        .from("prestaciones_acuerdos")
        .update({
          // prestaciones_acuerdos has no updated_at column in the canonical schema.
          estado: "Finalizado",
        })
        .eq("id", acuerdoId)
        .select("id, empleado_id")
        .single()

      if (finalizeError) throw finalizeError

      // Look up the empleado name manually to avoid PostgREST embedded join.
      if (acuerdoActualizado?.empleado_id) {
        const { data: emp } = await supabase
          .from("empleados")
          .select("nombre_completo")
          .eq("id", acuerdoActualizado.empleado_id)
          .maybeSingle()
        empleadoNombre = emp?.nombre_completo || null
      }
    }

    return NextResponse.json({
      success: true,
      data: updated,
      finalizado: allPaid,
      empleado_nombre: empleadoNombre,
    })
  } catch (err: any) {
    console.error("[v0] Error POST prestaciones-pagos/pagar:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
