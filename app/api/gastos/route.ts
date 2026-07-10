import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoriaId = searchParams.get("categoria_id")
    const fechaDesde = searchParams.get("fecha_desde")
    const fechaHasta = searchParams.get("fecha_hasta")

    const supabase = await getSupabaseServerClient()
    let query = supabase
      .from("gastos")
      .select("*, categorias_gastos(id, nombre)")
      .order("fecha", { ascending: false })
      .order("id", { ascending: false })

    if (categoriaId) query = query.eq("categoria_id", categoriaId)
    if (fechaDesde) query = query.gte("fecha", fechaDesde)
    if (fechaHasta) query = query.lte("fecha", fechaHasta)

    const { data, error } = await query
    if (error) {
      console.error("[v0] Error fetching gastos:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.categoria_id || body.monto === undefined || body.monto === null || !body.fecha) {
      return NextResponse.json({ error: "Faltan campos requeridos (categoria, monto, fecha)" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase
      .from("gastos")
      .insert({
        categoria_id: body.categoria_id,
        monto: Number(body.monto),
        fecha: body.fecha,
        descripcion: body.descripcion || null,
        metodo_pago: body.metodo_pago || null,
        url_comprobante: body.url_comprobante || null,
      })
      .select("*, categorias_gastos(id, nombre)")
      .single()

    if (error) {
      console.error("[v0] Error creating gasto:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
