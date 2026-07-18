import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params
    const body = await request.json()

    // If modifying critical fields (monto, pagado reset, etc), require password.
    // Editing only `comentario` does NOT require a password — it's a soft annotation.
    const requiresPassword = body.monto_esperado !== undefined || 
      (body.pagado === false && body.comprobante === null) // Deleting/resetting a payment
    
    if (requiresPassword) {
      if (!body.password || body.password !== process.env.PLAN_PAGOS_ADMIN_PASSWORD) {
        return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 })
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (body.pagado !== undefined) updateData.pagado = body.pagado
    if (body.confirmado !== undefined) updateData.confirmado = body.confirmado
    if (body.comprobante !== undefined) updateData.comprobante = body.comprobante
    if (body.fecha_pago !== undefined) updateData.fecha_pago = body.fecha_pago
    if (body.referencia !== undefined) updateData.referencia = body.referencia
    if (body.usuariopago !== undefined) updateData.usuariopago = body.usuariopago
    if (body.usuarioconfirma !== undefined) updateData.usuarioconfirma = body.usuarioconfirma
    if (body.monto_esperado !== undefined) updateData.monto_esperado = body.monto_esperado
    // Allow free-text annotation per cuota (used by the payment-history UI).
    if (body.comentario !== undefined) updateData.comentario = body.comentario

    const { data, error } = await supabase
      .from("plan_pagos")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[v0] Error updating plan_pagos:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params

    const { error } = await supabase.from("plan_pagos").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error deleting plan_pagos:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
