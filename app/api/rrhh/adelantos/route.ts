import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const estado = searchParams.get("estado")
  const fechaInicio = searchParams.get("fecha_inicio")
  const fechaFin = searchParams.get("fecha_fin")

  try {
    // Date range query for liquidation (only approved advances)
    if (fechaInicio && fechaFin && estado === "aprobada") {
      const { data, error } = await supabase
        .from("adelantos_nomina")
        .select("empleado_id, monto")
        .eq("estado", "aprobada")
        .gte("periodo_descuento", fechaInicio)
        .lte("periodo_descuento", fechaFin)

      if (error) throw error
      return NextResponse.json({ success: true, data: data || [] })
    }

    let query = supabase
      .from("adelantos_nomina")
      .select("*")
      .order("fecha_solicitud", { ascending: false })

    if (estado) {
      query = query.eq("estado", estado)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error fetching adelantos:", error)
    return NextResponse.json({ error: "Error al obtener adelantos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { empleado_id, monto, justificacion, periodo_descuento, url_firma_solicitante } = body

    const { data, error } = await supabase
      .from("adelantos_nomina")
      .insert({
        empleado_id,
        monto,
        justificacion,
        periodo_descuento,
        url_firma_solicitante,
        estado: "pendiente",
        fecha_solicitud: new Date().toISOString().split("T")[0],
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error creating adelanto:", error)
    return NextResponse.json({ error: "Error al crear adelanto" }, { status: 500 })
  }
}
