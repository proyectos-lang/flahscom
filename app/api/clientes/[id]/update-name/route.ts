import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { nuevoNombre, contratoId } = await request.json()

    if (!nuevoNombre || !nuevoNombre.trim()) {
      return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 })
    }

    const { id } = await params
    const clienteId = Number.parseInt(id)

    if (Number.isNaN(clienteId)) {
      return NextResponse.json({ error: "ID de cliente inválido" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Update cliente name
    const { data: clienteData, error: clienteError } = await supabase
      .from("clientes")
      .update({ nombre_completo: nuevoNombre.trim() })
      .eq("id", clienteId)
      .select()
      .single()

    if (clienteError) {
      console.error("[v0] Error updating cliente:", clienteError)
      return NextResponse.json({ error: clienteError.message }, { status: 500 })
    }

    // Update plan_pagos for this contract
    if (contratoId) {
      const { error: planError } = await supabase
        .from("plan_pagos")
        .update({ cliente: nuevoNombre.trim() })
        .eq("contrato_id", Number.parseInt(contratoId))

      if (planError) {
        console.error("[v0] Error updating plan_pagos:", planError)
      }
    }

    console.log("[v0] Updated cliente", clienteId, "name to:", nuevoNombre)

    return NextResponse.json({
      success: true,
      cliente: clienteData,
      message: "Nombre del cliente actualizado correctamente",
    })
  } catch (error) {
    console.error("[v0] Error in update-name API:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
