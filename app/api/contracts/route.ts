import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")
    const month = searchParams.get("month")
    const estado = searchParams.get("estado")
    const contractId = searchParams.get("contractId")
    const fechaDesde = searchParams.get("fechaDesde")
    const fechaHasta = searchParams.get("fechaHasta")
    const exportAll = searchParams.get("exportAll") === "true"
    const chunk = Number.parseInt(searchParams.get("chunk") || "0")
    const clienteSearch = searchParams.get("cliente")
    const clienteIdSearch = searchParams.get("cliente_id")
    
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = 50
    const chunkSize = 1000
    
    const offset = exportAll ? chunk * chunkSize : (page - 1) * limit

    let query = supabase.from("contratos").select("*", { count: "exact" }).order("id", { ascending: false })

    // Apply estado filter
    if (estado && estado !== "all") {
      query = query.eq("estado_auditoria", estado)
    }

    // Filter by cliente_id
    if (clienteIdSearch && clienteIdSearch.trim() !== "") {
      const clienteId = Number.parseInt(clienteIdSearch)
      if (!Number.isNaN(clienteId)) {
        query = query.eq("cliente_id", clienteId)
      }
    }

    if (contractId && contractId.trim() !== "") {
      const id = Number.parseInt(contractId)
      if (!Number.isNaN(id)) {
        query = query.eq("id", id)
      }
    }

    // Apply date filter directly in the query so pagination works correctly
    if (fechaDesde && fechaHasta) {
      query = query.gte("fecha_contratacion", fechaDesde).lte("fecha_contratacion", fechaHasta + "T23:59:59.999Z")
    } else if (year && month) {
      const startDate = `${year}-${month.padStart(2, "0")}-01T00:00:00`
      const lastDay = new Date(Number.parseInt(year), Number.parseInt(month), 0).getDate()
      const endDate = `${year}-${month.padStart(2, "0")}-${String(lastDay).padStart(2, "0")}T23:59:59.999Z`
      query = query.gte("fecha_contratacion", startDate).lte("fecha_contratacion", endDate)
    }

    // Apply pagination
    if (!exportAll) {
      query = query.range(offset, offset + limit - 1)
    } else {
      query = query.range(offset, offset + chunkSize - 1)
    }

    const { data: contratos, error: contratosError, count } = await query

    if (contratosError) {
      console.error("[v0] Error fetching contracts:", contratosError)
      return NextResponse.json({ error: contratosError.message }, { status: 500 })
    }

    let filteredContratos = contratos || []

    const totalCount = count ?? 0

    if (!filteredContratos || filteredContratos.length === 0) {
      return NextResponse.json({ contracts: [], total: 0, page, limit, totalPages: 0 })
    }

    const paqueteIds = [...new Set(filteredContratos.map((c: any) => c.paquete_id).filter(Boolean))]
    const vendedorIds = [...new Set(filteredContratos.map((c: any) => c.vendedor_id).filter(Boolean))]
    const clienteIds = [...new Set(filteredContratos.map((c: any) => c.cliente_id).filter(Boolean))]

    const { data: paquetes } = await supabase.from("paquetes").select("*").in("id", paqueteIds)

    const { data: vendedores } = await supabase.from("vendedores").select("*").in("id", vendedorIds)

    const { data: clientes } = await supabase.from("clientes").select("*").in("id", clienteIds)

    const paquetesMap = new Map((paquetes || []).map((p: any) => [p.id, p]))
    const vendedoresMap = new Map((vendedores || []).map((v: any) => [v.id, v]))
    const clientesMap = new Map((clientes || []).map((c: any) => [c.id, c]))

    let contratosConDatos = filteredContratos.map((contrato: any) => ({
      ...contrato,
      paquete: paquetesMap.get(contrato.paquete_id) || null,
      vendedor: vendedoresMap.get(contrato.vendedor_id) || null,
      cliente: clientesMap.get(contrato.cliente_id) || null,
    }))

    // Filter by client name if provided
    if (clienteSearch && clienteSearch.trim() !== "") {
      const searchLower = clienteSearch.toLowerCase()
      contratosConDatos = contratosConDatos.filter((contrato: any) => {
        const clienteName = contrato.cliente?.nombre_completo || ""
        return clienteName.toLowerCase().includes(searchLower)
      })
    }

    // Handle export response format
    if (exportAll) {
      const totalRecords = contratosConDatos.length
      const hasMore = (chunk + 1) * chunkSize < totalRecords
      console.log(`[v0] Export chunk ${chunk}: ${contratosConDatos.length} records. Total: ${totalRecords}, hasMore: ${hasMore}`)
      return NextResponse.json({
        contracts: contratosConDatos,
        total: totalRecords,
        hasMore: hasMore,
        chunk: chunk,
      })
    }

    return NextResponse.json({
      contracts: contratosConDatos,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Error al cargar contratos" }, { status: 500 })
  }
}
