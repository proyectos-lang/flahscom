import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await getSupabaseServerClient()

    const updateData: Record<string, any> = {}
    if (body.nombre !== undefined) updateData.nombre = String(body.nombre).trim()
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion

    const { data, error } = await supabase
      .from("categorias_gastos")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()

    // Prevent deletion if there are gastos using this categoria
    const { count, error: countError } = await supabase
      .from("gastos")
      .select("*", { count: "exact", head: true })
      .eq("categoria_id", id)

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }
    if ((count || 0) > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: existen ${count} gasto(s) asociado(s) a esta categoria` },
        { status: 400 },
      )
    }

    const { error } = await supabase.from("categorias_gastos").delete().eq("id", id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
