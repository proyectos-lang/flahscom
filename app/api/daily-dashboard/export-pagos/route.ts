import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

const BATCH_SIZE = 1000

// Formats the voucher date (pagoreferencia) as DD/MM/YYYY. Empty for older
// payments that predate this column.
function formatPagoReferencia(value: unknown): string {
  if (!value) return ""
  const datePart = String(value).split("T")[0]
  const [y, m, d] = datePart.split("-")
  if (!y || !m || !d) return String(value)
  return `${d}/${m}/${y}`
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0]
    const mode = searchParams.get("mode") || "monthly"

    console.log("[v0] Exporting pagos CSV for:", dateStr, "mode:", mode)

    const supabase = await getSupabaseServerClient()

    // Build the date range depending on mode
    let startDate: string
    let endDate: string

    if (mode === "monthly") {
      const [year, month] = dateStr.split("-")
      const y = Number(year)
      const m = Number(month)
      startDate = `${year}-${month}-01`
      const lastDay = new Date(y, m, 0).getDate()
      endDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}`
    } else {
      startDate = dateStr
      endDate = dateStr
    }

    // Fetch all matching pagos in batches of BATCH_SIZE using range pagination
    const allRows: any[] = []
    let from = 0
    let keepFetching = true

    while (keepFetching) {
      const to = from + BATCH_SIZE - 1
      console.log(`[v0] Fetching pagos batch: rows ${from} - ${to}`)

      const { data, error } = await supabase
        .from("plan_pagos")
        .select(
          "contrato_id, numero_cuota, monto_esperado, fecha_pago, fecha_vencimiento, referencia, pagoreferencia, cliente",
        )
        .gte("fecha_pago", startDate)
        .lte("fecha_pago", endDate)
        .order("fecha_pago", { ascending: true })
        .order("contrato_id", { ascending: true })
        .range(from, to)

      if (error) {
        console.error("[v0] Error fetching batch:", error)
        throw error
      }

      const batchRows = data || []
      allRows.push(...batchRows)

      // If we got fewer than BATCH_SIZE, we've exhausted the table
      if (batchRows.length < BATCH_SIZE) {
        keepFetching = false
      } else {
        from += BATCH_SIZE
      }
    }

    console.log(`[v0] Total pagos exported: ${allRows.length}`)

    // Return structured rows so the client can build a real .xlsx workbook with
    // each value in its own column (instead of a concatenated CSV string).
    const rows = allRows.map((pago) => [
      pago.cliente ?? "",
      pago.contrato_id ?? "",
      pago.numero_cuota ?? "",
      pago.fecha_pago ?? "",
      pago.fecha_vencimiento ?? "",
      pago.referencia ?? "",
      formatPagoReferencia(pago.pagoreferencia),
      pago.monto_esperado != null ? Number(pago.monto_esperado) : 0,
    ])

    return NextResponse.json({ total: allRows.length, rows })
  } catch (error: any) {
    console.error("[v0] Error exporting pagos:", error)
    return NextResponse.json(
      { error: error.message || "Error al exportar pagos" },
      { status: 500 },
    )
  }
}
