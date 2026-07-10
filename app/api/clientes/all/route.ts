import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"))
    const limit = 100 // 100 clients per page

    const offset = (page - 1) * limit

    // Get total count
    const { count, error: countError } = await supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })

    if (countError) {
      console.error("[v0] Error getting client count:", countError)
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    console.log("[v0] Total clients in DB:", count, "| Requesting page:", page, "| Offset:", offset, "| Limit:", limit)

    // Get paginated data using range - correct Supabase syntax
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nombre_completo, contratos(id)")
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("[v0] Error fetching clients:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalClientes = count || 0
    const totalPages = Math.ceil(totalClientes / limit)

    console.log("[v0] Page", page, "returned", (data || []).length, "clients | Total pages:", totalPages)

    // Map clientes to include contrato_id from the first contract
    const clientesWithContratoId = (data || []).map((cliente: any) => ({
      id: cliente.id,
      nombre_completo: cliente.nombre_completo,
      contrato_id: cliente.contratos?.[0]?.id || null,
    }))

    return NextResponse.json({
      clientes: clientesWithContratoId,
      total: totalClientes,
      page,
      limit,
      totalPages,
    })
  } catch (error) {
    console.error("[v0] Error in all-clients API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
