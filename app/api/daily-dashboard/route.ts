import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0]
    const mode = searchParams.get("mode") || "daily"

    console.log("[v0] Fetching dashboard data for:", dateStr, "mode:", mode)

    const supabase = await getSupabaseServerClient()

    // Helper: fetch ALL rows of `plan_pagos` in batches of 1000 to bypass the
    // PostgREST default row cap. Applies either a daily or monthly date filter.
    // Returns the full dataset (for UI listing) AND the exact total sum.
    const fetchAllPagos = async (filter: "daily" | "monthly", start: string, end?: string) => {
      const BATCH_SIZE = 1000
      const all: any[] = []
      let from = 0
      let totalSum = 0

      // Loop: fetch 1000 rows at a time until we get an empty/partial batch
      // Safety cap at 500 iterations (500k rows) to avoid infinite loops
      for (let iter = 0; iter < 500; iter++) {
        const to = from + BATCH_SIZE - 1

        let query = supabase
          .from("plan_pagos")
          .select(
            "contrato_id, numero_cuota, monto_esperado, fecha_pago, fecha_vencimiento, referencia, cliente",
          )
          .order("fecha_pago", { ascending: true })
          .range(from, to)

        if (filter === "monthly" && end) {
          query = query.gte("fecha_pago", start).lte("fecha_pago", end)
        } else {
          query = query.eq("fecha_pago", start)
        }

        const { data: batch, error: batchError } = await query
        if (batchError) throw batchError

        const rows = batch || []
        all.push(...rows)

        // Accumulate the sum in the loop so totals reflect EVERY row, not just the first 1000
        for (const p of rows) totalSum += Number(p.monto_esperado || 0)

        console.log(
          `[v0] pagos batch ${iter + 1}: fetched ${rows.length} rows (range ${from}-${to}), running total=${all.length}`,
        )

        // Last batch if less than BATCH_SIZE
        if (rows.length < BATCH_SIZE) break
        from += BATCH_SIZE
      }

      return { rows: all, totalSum }
    }

    let ventasAll
    let pagosRows: any[] = []
    let pagosCount = 0
    let pagosSum = 0

    if (mode === "monthly") {
      // Monthly mode: filter by year-month (YYYY-MM)
      const [year, month] = dateStr.split("-")
      const startDate = `${year}-${month}-01`
      const endDate = `${year}-${month}-${new Date(Number(year), Number(month), 0).getDate()}`

      // Get sales for the month
      const { data: ventasData, error: ventasError } = await supabase
        .from("contratos")
        .select("id, nombre_paquete, valor_paquete, fechanormal")
        .gte("fechanormal", startDate)
        .lte("fechanormal", endDate)

      if (ventasError) {
        console.error("[v0] Error fetching ventas:", ventasError)
        throw ventasError
      }
      ventasAll = ventasData

      const { rows, totalSum } = await fetchAllPagos("monthly", startDate, endDate)
      pagosRows = rows
      pagosCount = rows.length
      pagosSum = totalSum
    } else {
      // Daily mode: exact date match
      const { data: ventasData, error: ventasError } = await supabase
        .from("contratos")
        .select("id, nombre_paquete, valor_paquete, fechanormal")
        .eq("fechanormal", dateStr)

      if (ventasError) {
        console.error("[v0] Error fetching ventas:", ventasError)
        throw ventasError
      }
      ventasAll = ventasData

      const { rows, totalSum } = await fetchAllPagos("daily", dateStr)
      pagosRows = rows
      pagosCount = rows.length
      pagosSum = totalSum
    }

    // Calculate total from ventas
    const totalVentas = (ventasAll || []).reduce(
      (sum: number, venta: any) => sum + Number(venta.valor_paquete || 0),
      0,
    )

    console.log("[v0] Filtered ventas:", ventasAll?.length || 0, "- Total valor:", totalVentas)

    // Totals reflect EVERY row fetched via batched pagination (no 1000-row cap)
    const cantidadVentas = ventasAll?.length || 0
    const cantidadPagos = pagosCount
    const totalPagos = pagosSum

    console.log(
      "[v0] Dashboard stats - Sales:",
      cantidadVentas,
      "| Total Ventas: L",
      totalVentas.toFixed(2),
      "| Payments:",
      cantidadPagos,
      "| Total Pagos: L",
      totalPagos.toFixed(2),
    )

    return NextResponse.json({
      date: dateStr,
      ventas: {
        cantidad: cantidadVentas,
        total: totalVentas,
        datos: ventasAll || [],
      },
      pagos: {
        cantidad: cantidadPagos,
        total: totalPagos,
        datos: pagosRows,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error fetching daily dashboard:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    )
  }
}
