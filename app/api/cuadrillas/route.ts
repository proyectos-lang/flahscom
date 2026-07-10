import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const activa = searchParams.get("activa")

    const supabase = await getSupabaseServerClient()

    let query = supabase
      .from("cuadrillas")
      .select("*")
      .order("nombre_cuadrilla", { ascending: true })

    if (activa === "true") {
      query = query.eq("activa", true)
    } else if (activa === "false") {
      query = query.eq("activa", false)
    }

    if (search) {
      query = query.or(`nombre_cuadrilla.ilike.%${search}%,lider_nombre.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("[v0] Error fetching cuadrillas:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    console.error("[v0] Error in cuadrillas GET:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre_cuadrilla, lider_nombre, telefono_lider, vehiculo_placa, activa, contrasena } = body

    if (!nombre_cuadrilla || !lider_nombre) {
      return NextResponse.json({ error: "Nombre y lider son requeridos" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const insertData: any = {
      nombre_cuadrilla,
      lider_nombre,
      telefono_lider: telefono_lider || null,
      vehiculo_placa: vehiculo_placa || null,
      activa: activa !== false,
    }

    if (contrasena) {
      insertData.contrasena = contrasena
    }

    const { data, error } = await supabase
      .from("cuadrillas")
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating cuadrilla:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[v0] Error in cuadrillas POST:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
