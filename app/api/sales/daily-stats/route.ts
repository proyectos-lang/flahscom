import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
)

export async function GET(request: Request) {
  try {
    // Get current date in Honduras timezone (America/Tegucigalpa, CST -6)
    const hondurasDate = new Date().toLocaleString("sv-SE", { timeZone: "America/Tegucigalpa" })
    const dateStr = hondurasDate.split(" ")[0] // YYYY-MM-DD format

    console.log("[v0] Fetching daily sales stats for date:", dateStr)

    // Get all contracts and filter by today's date
    const { data: allContracts, error: contractsError } = await supabase
      .from("contratos")
      .select("id, fecha_contratacion, valor_paquete, estado_auditoria")

    if (contractsError) {
      console.error("[v0] Error fetching contracts:", contractsError)
      throw contractsError
    }

    // Filter contracts for today
    const todayContracts = (allContracts || []).filter((contract: any) => {
      const contractDate = contract.fecha_contratacion.split("T")[0]
      return contractDate === dateStr
    })

    console.log("[v0] Contracts for today:", todayContracts.length)

    // Calculate stats
    const cantidadVentas = todayContracts.length
    const totalVenta = todayContracts.reduce(
      (sum, contract) => sum + Number(contract.valor_paquete || 0),
      0
    )
    const aprobados = todayContracts.filter(
      (contract) =>
        contract.estado_auditoria?.toLowerCase() === "aprobada" ||
        contract.estado_auditoria?.toLowerCase() === "aprobado"
    ).length

    console.log(
      "[v0] Daily sales stats - Sales:",
      cantidadVentas,
      "| Total:",
      totalVenta,
      "| Approved:",
      aprobados
    )

    return NextResponse.json({
      date: dateStr,
      cantidadVentas,
      totalVenta,
      aprobados,
    })
  } catch (error: any) {
    console.error("[v0] Error fetching daily sales stats:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
