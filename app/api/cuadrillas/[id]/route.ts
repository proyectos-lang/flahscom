import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const supabase = await getSupabaseServerClient()

    const updateData: any = {}
    if (body.nombre_cuadrilla !== undefined) updateData.nombre_cuadrilla = body.nombre_cuadrilla
    if (body.lider_nombre !== undefined) updateData.lider_nombre = body.lider_nombre
    if (body.telefono_lider !== undefined) updateData.telefono_lider = body.telefono_lider
    if (body.vehiculo_placa !== undefined) updateData.vehiculo_placa = body.vehiculo_placa
    if (body.activa !== undefined) updateData.activa = body.activa
    if (body.contrasena !== undefined && body.contrasena) updateData.contrasena = body.contrasena

    const { data, error } = await supabase
      .from("cuadrillas")
      .update(updateData)
      .eq("id", Number(id))
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating cuadrilla:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[v0] Error in cuadrillas PATCH:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()

    // Delete members first
    await supabase
      .from("cuadrilla_miembros")
      .delete()
      .eq("cuadrilla_id", Number(id))

    const { error } = await supabase
      .from("cuadrillas")
      .delete()
      .eq("id", Number(id))

    if (error) {
      console.error("[v0] Error deleting cuadrilla:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error in cuadrillas DELETE:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
