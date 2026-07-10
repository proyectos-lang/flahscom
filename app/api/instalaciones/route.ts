import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"))
    const limit = 1000 // 1000 records per page

    const offset = (page - 1) * limit

    const supabase = await getSupabaseServerClient()

    // Get total count first
    const { count, error: countError } = await supabase
      .from("contratos")
      .select("id", { count: "exact", head: true })
      .eq("estado_auditoria", "aprobada")

    if (countError) {
      console.error("[v0] Error getting count:", countError)
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    // Get paginated approved contracts with joined client information in a single query
    const { data: contratos, error: contratosError } = await supabase
      .from("contratos")
      .select(
        `
        id,
        nombre_paquete,
        estado_auditoria,
        fecha_contratacion,
        valor_paquete,
        estatusinstalacion,
        clientes(nombre_completo, latitud, longitud)
      `,
      )
      .eq("estado_auditoria", "aprobada")
      .order("fecha_contratacion", { ascending: false })
      .range(offset, offset + limit - 1)

    if (contratosError) {
      console.error("[v0] Error fetching contratos with clients:", contratosError)
      return NextResponse.json({ error: contratosError.message }, { status: 500 })
    }

    // Transform data to match expected format
    const instalacionesData = (contratos || []).map((contrato: any) => ({
      id: contrato.id,
      nombre_completo: contrato.clientes?.nombre_completo || "N/A",
      nombre_paquete: contrato.nombre_paquete,
      estado_auditoria: contrato.estado_auditoria,
      fecha_contratacion: contrato.fecha_contratacion,
      valor_paquete: contrato.valor_paquete,
      estatusinstalacion: contrato.estatusinstalacion || "pendiente",
      latitud: contrato.clientes?.latitud || null,
      longitud: contrato.clientes?.longitud || null,
    }))

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    console.log("[v0] Instalaciones page", page, "- Fetched:", instalacionesData.length, "| Total:", total)

    return NextResponse.json({
      success: true,
      data: instalacionesData,
      page,
      limit,
      total,
      totalPages,
    })
  } catch (error) {
    console.error("[v0] Error in instalaciones API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
