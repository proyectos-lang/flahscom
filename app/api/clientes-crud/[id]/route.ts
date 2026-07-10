import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()

    const { data: cliente, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", Number(id))
      .single()

    if (error) {
      console.error("[v0] Error fetching cliente:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, cliente })
  } catch (error: any) {
    console.error("[v0] Error in cliente GET:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      nombre_completo,
      numero_identidad,
      telefono,
      direccion,
      latitud,
      longitud,
      email,
    } = body

    if (!nombre_completo || !numero_identidad) {
      return NextResponse.json(
        { error: "Nombre completo y número de identidad son requeridos" },
        { status: 400 }
      )
    }

    const supabase = await getSupabaseServerClient()

    const updateData: any = {
      nombre_completo,
      numero_identidad,
      telefono: telefono || null,
      direccion: direccion || null,
      latitud: latitud ? parseFloat(latitud) : null,
      longitud: longitud ? parseFloat(longitud) : null,
      email: email || null,
    }

    const { data: cliente, error } = await supabase
      .from("clientes")
      .update(updateData)
      .eq("id", Number(id))
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating cliente:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Si el nombre cambió, actualizar plan_pagos
    if (nombre_completo) {
      // Obtener todos los contratos del cliente
      const { data: contratos, error: contratosError } = await supabase
        .from("contratos")
        .select("id")
        .eq("cliente_id", Number(id))

      if (!contratosError && contratos && contratos.length > 0) {
        const contratoIds = contratos.map(c => c.id)
        
        // Actualizar plan_pagos para todos los contratos del cliente
        const { error: planPagosError } = await supabase
          .from("plan_pagos")
          .update({ cliente: nombre_completo })
          .in("contrato_id", contratoIds)

        if (planPagosError) {
          console.error("[v0] Error updating plan_pagos:", planPagosError)
          // No fallar la operación completa, solo registrar el error
        }
      }
    }

    return NextResponse.json({ success: true, cliente })
  } catch (error: any) {
    console.error("[v0] Error in cliente PUT:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()

    // Check if cliente has related contracts
    const { data: contratos, error: checkError } = await supabase
      .from("contratos")
      .select("id")
      .eq("cliente_id", Number(id))
      .limit(1)

    if (checkError) {
      console.error("[v0] Error checking contracts:", checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (contratos && contratos.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar el cliente porque tiene contratos asociados" },
        { status: 400 }
      )
    }

    const { error } = await supabase.from("clientes").delete().eq("id", Number(id))

    if (error) {
      console.error("[v0] Error deleting cliente:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error in cliente DELETE:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
