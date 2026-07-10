import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

// Portfolio (Cartera) API.
//
// IMPORTANT: To keep this in sync with the Historial (payment-history) module,
// the cliente shown for a given contrato_id MUST come from the canonical join:
//
//     contratos.id  ->  contratos.cliente_id  ->  clientes
//
// The denormalized fields baked into `v_cuota_vigente_detallada` can be stale
// (e.g. if the cliente was renamed after the view materialized), which is why
// the same contract was rendering a different client here vs. in Historial.
//
// Strategy:
//   1. Resolve which contrato_ids to list (apply search/searchId filters using
//      the canonical clientes/contratos tables, so name search matches what
//      Historial would find).
//   2. Fetch cuota-level info (numero_cuota, fecha_vencimiento, monto_esperado,
//      estado) from the view for those contrato_ids only.
//   3. Re-attach nombre/identidad/direccion from the live clientes table.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"))
    const limit = 1000
    const search = (searchParams.get("search") || "").trim()
    const searchId = (searchParams.get("searchId") || "").trim()

    const offset = (page - 1) * limit

    const supabase = await getSupabaseServerClient()

    // --- 1. Resolve target contrato_ids when filtering by name ------------
    // When the user searches by name, we look up matching clientes first (the
    // same source Historial uses) and then translate those into contrato_ids,
    // instead of filtering the view's potentially-stale denormalized name.
    let filterContractIds: number[] | null = null
    if (search) {
      const { data: clientesMatch, error: clientesErr } = await supabase
        .from("clientes")
        .select("id")
        .ilike("nombre_completo", `%${search}%`)
        .limit(5000)
      if (clientesErr) {
        console.error("[v0] Error searching clientes:", clientesErr)
        return NextResponse.json({ error: clientesErr.message }, { status: 500 })
      }
      const clienteIds = (clientesMatch || []).map((c: any) => c.id)
      if (clienteIds.length === 0) {
        return NextResponse.json({ success: true, data: [], total: 0, page, limit, totalPages: 0 })
      }
      const { data: contratosMatch, error: contratosErr } = await supabase
        .from("contratos")
        .select("id")
        .in("cliente_id", clienteIds)
        .limit(10000)
      if (contratosErr) {
        console.error("[v0] Error fetching contratos by cliente_id:", contratosErr)
        return NextResponse.json({ error: contratosErr.message }, { status: 500 })
      }
      filterContractIds = (contratosMatch || []).map((c: any) => c.id)
      if (filterContractIds.length === 0) {
        return NextResponse.json({ success: true, data: [], total: 0, page, limit, totalPages: 0 })
      }
    }

    // --- 2. Build base query against the view ----------------------------
    let countQuery = supabase
      .from("v_cuota_vigente_detallada")
      .select("contrato_id", { count: "exact", head: true })
    let dataQuery = supabase
      .from("v_cuota_vigente_detallada")
      .select("contrato_id, numero_cuota, fecha_vencimiento, monto_esperado, estado, comentario")

    if (searchId) {
      const idNum = Number.parseInt(searchId)
      if (!Number.isNaN(idNum)) {
        countQuery = countQuery.eq("contrato_id", idNum)
        dataQuery = dataQuery.eq("contrato_id", idNum)
      }
    }

    if (filterContractIds) {
      countQuery = countQuery.in("contrato_id", filterContractIds)
      dataQuery = dataQuery.in("contrato_id", filterContractIds)
    }

    const { count, error: countError } = await countQuery
    if (countError) {
      console.error("[v0] Error getting count:", countError)
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    const { data: cuotas, error: cuotasError } = await dataQuery
      .order("contrato_id", { ascending: true })
      .range(offset, offset + limit - 1)
    if (cuotasError) {
      console.error("[v0] Error fetching cuotas:", cuotasError)
      return NextResponse.json({ error: cuotasError.message }, { status: 500 })
    }

    // --- 3. Enrich each row with live cliente data -----------------------
    // Join contratos -> clientes for the contrato_ids actually rendered.
    const contractIds = Array.from(
      new Set((cuotas || []).map((c: any) => c.contrato_id).filter(Boolean)),
    ) as number[]

    let clienteByContrato: Record<number, {
      nombre_completo: string
      numero_identidad: string
      direccion: string
    }> = {}

    if (contractIds.length > 0) {
      const { data: contratos, error: contratosErr } = await supabase
        .from("contratos")
        .select("id, cliente_id")
        .in("id", contractIds)
      if (contratosErr) {
        console.error("[v0] Error fetching contratos for enrichment:", contratosErr)
        return NextResponse.json({ error: contratosErr.message }, { status: 500 })
      }

      const clienteIds = Array.from(
        new Set((contratos || []).map((c: any) => c.cliente_id).filter(Boolean)),
      ) as number[]

      let clienteById: Record<number, any> = {}
      if (clienteIds.length > 0) {
        const { data: clientes, error: clientesErr } = await supabase
          .from("clientes")
          .select("id, nombre_completo, numero_identidad, direccion")
          .in("id", clienteIds)
        if (clientesErr) {
          console.error("[v0] Error fetching clientes for enrichment:", clientesErr)
          return NextResponse.json({ error: clientesErr.message }, { status: 500 })
        }
        for (const cli of clientes || []) clienteById[cli.id] = cli
      }

      for (const con of contratos || []) {
        const cli = con.cliente_id ? clienteById[con.cliente_id] : null
        clienteByContrato[con.id] = {
          nombre_completo: cli?.nombre_completo ?? "",
          numero_identidad: cli?.numero_identidad ?? "",
          direccion: cli?.direccion ?? "",
        }
      }
    }

    const enriched = (cuotas || []).map((c: any) => ({
      contrato_id: c.contrato_id,
      numero_cuota: c.numero_cuota,
      fecha_vencimiento: c.fecha_vencimiento,
      monto_esperado: c.monto_esperado,
      estado: c.estado,
      comentario: c.comentario ?? "",
      nombre_completo: clienteByContrato[c.contrato_id]?.nombre_completo ?? "",
      numero_identidad: clienteByContrato[c.contrato_id]?.numero_identidad ?? "",
      direccion: clienteByContrato[c.contrato_id]?.direccion ?? "",
    }))

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    console.log(
      "[v0] Portfolio page",
      page,
      "- Cuotas:",
      enriched.length,
      "| Total:",
      total,
      "| Pages:",
      totalPages,
    )

    return NextResponse.json({
      success: true,
      data: enriched,
      total,
      page,
      limit,
      totalPages,
    })
  } catch (error: any) {
    console.error("[v0] Portfolio API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
