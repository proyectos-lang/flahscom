import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const nombreSearch = searchParams.get("nombre")
    const identidadSearch = searchParams.get("identidad")
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"))
    const limit = 50

    if ((!nombreSearch || !nombreSearch.trim()) && (!identidadSearch || !identidadSearch.trim())) {
      return NextResponse.json({ clientes: [], total: 0, page, limit, totalPages: 0 })
    }

    const offset = (page - 1) * limit
    const supabase = await getSupabaseServerClient()

    const isNumericSearch = !isNaN(Number(nombreSearch)) && (nombreSearch || "").trim() !== ""

    let countQuery = supabase
      .from("clientes")
      .select("*", { count: "exact", head: true })

    let dataQuery = supabase
      .from("clientes")
      .select("id, nombre_completo, contratos(id)")
      .order("nombre_completo", { ascending: true })
      .range(offset, offset + limit - 1)

    if (identidadSearch && identidadSearch.trim()) {
      countQuery = countQuery.ilike("numero_identidad", `%${identidadSearch.trim()}%`)
      dataQuery = dataQuery.ilike("numero_identidad", `%${identidadSearch.trim()}%`)
    } else if (isNumericSearch) {
      countQuery = countQuery.eq("id", Number(nombreSearch))
      dataQuery = dataQuery.eq("id", Number(nombreSearch))
    } else {
      countQuery = countQuery.ilike("nombre_completo", `%${(nombreSearch || "").trim()}%`)
      dataQuery = dataQuery.ilike("nombre_completo", `%${(nombreSearch || "").trim()}%`)
    }

    const [{ count }, { data, error }] = await Promise.all([countQuery, dataQuery])

    if (error) {
      console.error("[v0] Error searching clientes:", error)
      return NextResponse.json({ clientes: [], total: 0, page, limit, totalPages: 0 }, { status: 500 })
    }

    const total = count ?? 0
    const totalPages = Math.ceil(total / limit)

    // Emit ONE row per contract. A cliente can own several contracts, and the
    // user needs to see and pick each one individually in the selection list
    // (e.g. the same name shown twice: one row for #4487 and one for #135).
    const clientesWithContratoId = (data || []).flatMap((cliente: any) => {
      const contratos = Array.isArray(cliente.contratos) ? cliente.contratos : []
      if (contratos.length === 0) {
        return [
          {
            id: cliente.id,
            nombre_completo: cliente.nombre_completo,
            contrato_id: null,
          },
        ]
      }
      return contratos
        .map((contrato: any) => ({
          id: cliente.id,
          nombre_completo: cliente.nombre_completo,
          contrato_id: contrato.id,
        }))
        .sort((a: any, b: any) => (b.contrato_id ?? 0) - (a.contrato_id ?? 0))
    })

    return NextResponse.json({
      clientes: clientesWithContratoId,
      total,
      page,
      limit,
      totalPages,
    })
  } catch (error: any) {
    console.error("[v0] Error in search clientes API:", error)
    return NextResponse.json({ clientes: [], total: 0, page: 1, limit: 50, totalPages: 0 }, { status: 500 })
  }
}
