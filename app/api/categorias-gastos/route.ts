import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase
      .from("categorias_gastos")
      .select("*")
      .order("nombre", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching categorias:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error("[v0] Error in GET categorias:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const nombre = (body?.nombre || "").toString().trim()
    if (!nombre) {
      return NextResponse.json({ error: "Nombre es requerido" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase
      .from("categorias_gastos")
      .insert({ nombre, descripcion: body?.descripcion || null })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating categoria:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[v0] Error in POST categorias:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
