import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const searchType = searchParams.get("searchType") || "nombre" // "nombre" o "id"

    const supabase = await getSupabaseServerClient()

    const offset = (page - 1) * limit

    let query = supabase.from("clientes").select("*", { count: "exact" })

    // Apply search filter
    if (search) {
      if (searchType === "id") {
        const searchId = parseInt(search)
        if (!isNaN(searchId)) {
          query = query.eq("id", searchId)
        }
      } else {
        query = query.ilike("nombre_completo", `%${search}%`)
      }
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1).order("id", { ascending: true })

    const { data: clientes, error, count } = await query

    if (error) {
      console.error("[v0] Error fetching clientes:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      clientes: clientes || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error: any) {
    console.error("[v0] Error in clientes GET:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
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

    const insertData: any = {
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
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating cliente:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, cliente })
  } catch (error: any) {
    console.error("[v0] Error in clientes POST:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
