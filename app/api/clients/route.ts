import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .not("latitud", "is", null)
      .not("longitud", "is", null)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching clients:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("[v0] Error in clients API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
