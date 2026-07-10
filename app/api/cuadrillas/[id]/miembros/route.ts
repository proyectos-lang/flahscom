import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
      .from("cuadrilla_miembros")
      .select("*")
      .eq("cuadrilla_id", Number(id))
      .order("nombre_tecnico", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching miembros:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    console.error("[v0] Error in miembros GET:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nombre_tecnico, rol_tecnico } = body

    if (!nombre_tecnico || !rol_tecnico) {
      return NextResponse.json({ error: "Nombre y rol son requeridos" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
      .from("cuadrilla_miembros")
      .insert({
        cuadrilla_id: Number(id),
        nombre_tecnico,
        rol_tecnico,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error adding miembro:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[v0] Error in miembros POST:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const miembroId = searchParams.get("miembro_id")

    if (!miembroId) {
      return NextResponse.json({ error: "miembro_id es requerido" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { error } = await supabase
      .from("cuadrilla_miembros")
      .delete()
      .eq("id", Number(miembroId))

    if (error) {
      console.error("[v0] Error deleting miembro:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error in miembros DELETE:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
