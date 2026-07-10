import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()

    const { data: cuadrillas, error } = await supabase
      .from("cuadrillas")
      .select("id, nombre_cuadrilla, lider_nombre, vehiculo_placa, telefono_lider, activa")
      .eq("activa", true)
      .order("nombre_cuadrilla", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching cuadrillas:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: cuadrillas || [] })
  } catch (error: any) {
    console.error("[v0] Error in cuadrillas GET:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
