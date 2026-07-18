import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month") // Format: YYYY-MM
    const page = Number.parseInt(searchParams.get("page") || "1")
    const exportAll = searchParams.get("exportAll") === "true"
    const chunk = Number.parseInt(searchParams.get("chunk") || "0")
    const chunkSize = 1000
    const limit = 50
    
    // Calculate offset based on chunk number if exporting
    const offset = exportAll ? chunk * chunkSize : (page - 1) * limit

    // Filter parameters
    const estadoFilter = searchParams.get("estado") // 'pagado', 'pendiente', 'atrasado'
    const confirmadoFilter = searchParams.get("confirmado") // 'si', 'no'
    const moraFilter = searchParams.get("mora") // 'yellow', 'red-light', 'red-intense'
    const contratoFilter = searchParams.get("contrato") // contract ID search
    const clienteFilter = searchParams.get("cliente") // client name search
    const fechaPagoDesde = searchParams.get("fechaPagoDesde") // payment date range start (YYYY-MM-DD)
    const fechaPagoHasta = searchParams.get("fechaPagoHasta") // payment date range end (YYYY-MM-DD)
    const registradoPorFilter = searchParams.get("registradoPor") // user who registered the payment
    const aprobadoPorFilter = searchParams.get("aprobadoPor") // user who approved (confirmed) the payment

    console.log("[v0] Filtering payments for month:", month, "page:", page, "exportAll:", exportAll)

    let query = supabase
      .from("plan_pagos")
      .select("*", { count: "exact" })

    // Filter by month if provided
    if (month) {
      const [year, monthNum] = month.split("-")
      const startDate = `${year}-${monthNum}-01`
      const nextMonth = new Date(Number.parseInt(year), Number.parseInt(monthNum), 1)
      const lastDay = new Date(nextMonth.getTime() - 1).getDate()
      const endDate = `${year}-${monthNum}-${String(lastDay).padStart(2, "0")}`

      console.log("[v0] Date range:", startDate, "to", endDate)
      query = query.gte("fecha_vencimiento", startDate).lte("fecha_vencimiento", endDate)
    }

    if (contratoFilter) {
      query = query.eq("contrato_id", Number.parseInt(contratoFilter))
    }

    if (clienteFilter) {
      query = query.ilike("cliente", `%${clienteFilter}%`)
    }

    // Handle confirmation filter - "Sin Confirmar" means paid but not confirmed (confirmado IS NULL)
    if (confirmadoFilter === "si") {
      query = query.eq("confirmado", "si")
    } else if (confirmadoFilter === "no") {
      // For "Sin Confirmar", we want: pagado = true AND confirmado IS NULL
      query = query.eq("pagado", true).is("confirmado", null)
    }

    if (fechaPagoDesde) {
      query = query.gte("fecha_pago", fechaPagoDesde)
    }

    if (fechaPagoHasta) {
      query = query.lte("fecha_pago", fechaPagoHasta)
    }

    if (registradoPorFilter) {
      query = query.ilike("usuariopago", `%${registradoPorFilter}%`)
    }

    if (aprobadoPorFilter) {
      query = query.ilike("usuarioconfirma", `%${aprobadoPorFilter}%`)
    }

    let countQuery = supabase
      .from("plan_pagos")
      .select("*", { count: "exact", head: true })

    if (month) {
      const [year, monthNum] = month.split("-")
      const startDate = `${year}-${monthNum}-01`
      const nextMonth = new Date(Number.parseInt(year), Number.parseInt(monthNum), 1)
      const lastDay = new Date(nextMonth.getTime() - 1).getDate()
      const endDate = `${year}-${monthNum}-${String(lastDay).padStart(2, "0")}`
      countQuery = countQuery.gte("fecha_vencimiento", startDate).lte("fecha_vencimiento", endDate)
    }

    if (contratoFilter) {
      countQuery = countQuery.eq("contrato_id", Number.parseInt(contratoFilter))
    }

    if (clienteFilter) {
      countQuery = countQuery.ilike("cliente", `%${clienteFilter}%`)
    }

    // Handle confirmation filter - "Sin Confirmar" means paid but not confirmed (confirmado IS NULL)
    if (confirmadoFilter === "si") {
      countQuery = countQuery.eq("confirmado", "si")
    } else if (confirmadoFilter === "no") {
      // For "Sin Confirmar", we want: pagado = true AND confirmado IS NULL
      countQuery = countQuery.eq("pagado", true).is("confirmado", null)
    }

    if (fechaPagoDesde) {
      countQuery = countQuery.gte("fecha_pago", fechaPagoDesde)
    }

    if (fechaPagoHasta) {
      countQuery = countQuery.lte("fecha_pago", fechaPagoHasta)
    }

    if (registradoPorFilter) {
      countQuery = countQuery.ilike("usuariopago", `%${registradoPorFilter}%`)
    }

    if (aprobadoPorFilter) {
      countQuery = countQuery.ilike("usuarioconfirma", `%${aprobadoPorFilter}%`)
    }

    const { count: totalCount } = await countQuery

    // If offset exceeds available data, return empty with corrected pagination
    if (totalCount !== null && offset >= totalCount && totalCount > 0) {
      return NextResponse.json({
        payments: [],
        total: totalCount,
        page: 1,
        limit,
        message: "Page out of range, please reset to page 1",
      })
    }

    query = query
      .order("contrato_id", { ascending: true })
      .order("fecha_vencimiento", { ascending: true })

    // Apply pagination
    if (!exportAll) {
      query = query.range(offset, offset + limit - 1)
    } else {
      // For export chunks, fetch chunkSize records
      query = query.range(offset, offset + chunkSize - 1)
    }

    const { data, error, count } = await query

    if (error) {
      console.error("[v0] Supabase error:", error)
      if (error.message?.includes("416") || error.code === "PGRST103") {
        return NextResponse.json({
          payments: [],
          total: 0,
          page: 1,
          limit,
          message: "No data in requested range",
        })
      }
      throw error
    }

    console.log("[v0] Found payments:", data?.length || 0, "Total count:", count)

    let filteredData = data || []
    const today = new Date().toISOString().split("T")[0]

    if (estadoFilter) {
      if (estadoFilter === "pagado") {
        filteredData = filteredData.filter((p) => p.pagado)
      } else if (estadoFilter === "pendiente") {
        filteredData = filteredData.filter((p) => !p.pagado && p.fecha_vencimiento >= today)
      } else if (estadoFilter === "atrasado") {
        filteredData = filteredData.filter((p) => !p.pagado && p.fecha_vencimiento < today)
      }
    }

    if (moraFilter && moraFilter !== "all") {
      filteredData = filteredData.filter((pago) => {
        if (pago.pagado) return false
        const vencimiento = new Date(pago.fecha_vencimiento)
        const diffDays = Math.floor((new Date().getTime() - vencimiento.getTime()) / (1000 * 60 * 60 * 24))

        if (moraFilter === "Pendiente") return diffDays >= 0 && diffDays <= 30
        if (moraFilter === "Cortar") return diffDays > 30
        return false
      })
    }

    if (exportAll) {
      // For export, return current chunk and indicate if more data exists
      const totalRecords = count || 0
      const hasMore = (chunk + 1) * chunkSize < totalRecords
      console.log(`[v0] Export chunk ${chunk}: ${filteredData.length} records. Total: ${totalRecords}, hasMore: ${hasMore}`)
      return NextResponse.json({ 
        data: filteredData, 
        total: totalRecords,
        hasMore: hasMore,
        chunk: chunk
      })
    }

    return NextResponse.json({ payments: filteredData, total: count, page, limit })
  } catch (error: any) {
    console.error("[v0] Error fetching plan_pagos:", error)
    return NextResponse.json(
      {
        payments: [],
        total: 0,
        page: 1,
        limit: 50,
        error: error.message,
      },
      { status: 200 },
    ) // Return 200 instead of 500 to avoid breaking the UI
  }
}
