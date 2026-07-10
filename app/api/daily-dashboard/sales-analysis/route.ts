import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

const BATCH_SIZE = 1000

// Aggregates monthly contracts (ventas) grouped by vendedor and by paquete,
// for both the selected day and the full month. Uses batched range pagination
// so there is NO 1000-row cap on the data analyzed.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0]

    // dateStr is YYYY-MM-DD. Derive the day and the month range from it.
    const [year, month] = dateStr.split("-")
    const startDate = `${year}-${month}-01`
    const lastDay = new Date(Number(year), Number(month), 0).getDate()
    const endDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}`

    console.log("[v0] sales-analysis day:", dateStr, "month:", startDate, "to", endDate)

    const supabase = await getSupabaseServerClient()

    // 1) Fetch ALL contracts for the month in batches of 1000.
    const contratos: any[] = []
    let from = 0
    for (let iter = 0; iter < 500; iter++) {
      const to = from + BATCH_SIZE - 1
      const { data, error } = await supabase
        .from("contratos")
        .select("id, vendedor_id, paquete_id, nombre_paquete, valor_paquete, fechanormal")
        .gte("fechanormal", startDate)
        .lte("fechanormal", endDate)
        .order("fechanormal", { ascending: true })
        .range(from, to)

      if (error) throw error

      const rows = data || []
      contratos.push(...rows)
      console.log(`[v0] contratos batch ${iter + 1}: ${rows.length} rows (running ${contratos.length})`)

      if (rows.length < BATCH_SIZE) break
      from += BATCH_SIZE
    }

    // 2) Resolve vendedor names in a single query.
    const vendedorIds = [...new Set(contratos.map((c) => c.vendedor_id).filter(Boolean))]
    const vendedoresMap = new Map<number, string>()
    if (vendedorIds.length > 0) {
      const { data: vendedores } = await supabase
        .from("vendedores")
        .select("*")
        .in("id", vendedorIds)
      for (const v of vendedores || []) {
        vendedoresMap.set(v.id, v.nombre || v.nombre_completo || `Vendedor #${v.id}`)
      }
    }

    // Accumulator helpers: group rows into { label -> { cantidad, valor } }.
    const buildAgg = () => new Map<string, { nombre: string; cantidad: number; valor: number }>()

    const addTo = (
      map: Map<string, { nombre: string; cantidad: number; valor: number }>,
      key: string,
      nombre: string,
      valor: number,
    ) => {
      const current = map.get(key) || { nombre, cantidad: 0, valor: 0 }
      current.cantidad += 1
      current.valor += valor
      map.set(key, current)
    }

    const vendedoresDia = buildAgg()
    const vendedoresMes = buildAgg()
    const paquetesDia = buildAgg()
    const paquetesMes = buildAgg()

    for (const c of contratos) {
      const valor = Number(c.valor_paquete || 0)
      const vendedorKey = String(c.vendedor_id ?? "sin")
      const vendedorNombre = c.vendedor_id
        ? vendedoresMap.get(c.vendedor_id) || `Vendedor #${c.vendedor_id}`
        : "Sin vendedor"
      const paqueteKey = c.nombre_paquete || String(c.paquete_id ?? "sin")
      const paqueteNombre = c.nombre_paquete || "Sin paquete"

      // Month totals (every row is within the month range).
      addTo(vendedoresMes, vendedorKey, vendedorNombre, valor)
      addTo(paquetesMes, paqueteKey, paqueteNombre, valor)

      // Day totals (only rows whose fechanormal matches the selected date).
      if (c.fechanormal === dateStr) {
        addTo(vendedoresDia, vendedorKey, vendedorNombre, valor)
        addTo(paquetesDia, paqueteKey, paqueteNombre, valor)
      }
    }

    // Convert each map to a sorted array (most sold by quantity first).
    const toSortedArray = (
      map: Map<string, { nombre: string; cantidad: number; valor: number }>,
    ) =>
      Array.from(map.values()).sort(
        (a, b) => b.cantidad - a.cantidad || b.valor - a.valor,
      )

    const totals = (
      map: Map<string, { nombre: string; cantidad: number; valor: number }>,
    ) =>
      Array.from(map.values()).reduce(
        (acc, x) => ({ cantidad: acc.cantidad + x.cantidad, valor: acc.valor + x.valor }),
        { cantidad: 0, valor: 0 },
      )

    return NextResponse.json({
      date: dateStr,
      month: `${year}-${month}`,
      totalContratosMes: contratos.length,
      vendedores: {
        dia: toSortedArray(vendedoresDia),
        mes: toSortedArray(vendedoresMes),
        totalesDia: totals(vendedoresDia),
        totalesMes: totals(vendedoresMes),
      },
      paquetes: {
        dia: toSortedArray(paquetesDia),
        mes: toSortedArray(paquetesMes),
        totalesDia: totals(paquetesDia),
        totalesMes: totals(paquetesMes),
      },
    })
  } catch (error: any) {
    console.error("[v0] Error in sales-analysis:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    )
  }
}
