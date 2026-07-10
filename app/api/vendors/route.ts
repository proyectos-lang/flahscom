import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        db: {
          schema: "public",
        },
      },
    )

    const body = await request.json()
    const { nombre, identificacion, activo } = body

    const { data, error } = await supabase
      .from("vendedores")
      .insert([{ nombre, identificacion, activo: activo ?? true }])
      .select()

    if (error) {
      console.error("[v0] Error creating vendor:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ vendor: data[0] })
  } catch (error) {
    console.error("[v0] Error in POST vendors:", error)
    return NextResponse.json({ error: "Error al crear vendedor" }, { status: 500 })
  }
}

export async function GET() {
  console.log("[v0] Vendors API route called")

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        db: {
          schema: "public",
        },
      },
    )

    console.log("[v0] Fetching vendors from Supabase...")

    const { data, error } = await supabase.from("vendedores").select("*").order("nombre", { ascending: true })

    if (error) {
      console.error("[v0] Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Vendors loaded successfully:", data?.length, "vendors")
    return NextResponse.json({ vendors: data || [] })
  } catch (error) {
    console.error("[v0] Error in vendors API route:", error)
    return NextResponse.json({ error: "Error al cargar vendedores" }, { status: 500 })
  }
}
