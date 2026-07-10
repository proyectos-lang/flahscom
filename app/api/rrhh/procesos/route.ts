import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: Fetch procesos for a specific employee
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const empleadoId = searchParams.get("empleado_id")

    let query = supabase
      .from("procesos_disciplinarios")
      .select("*")
      .order("fecha_sancion", { ascending: false })

    if (empleadoId) {
      query = query.eq("empleado_id", parseInt(empleadoId))
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error("Error fetching procesos disciplinarios:", error)
    return NextResponse.json({ success: false, error: "Error al cargar procesos" }, { status: 500 })
  }
}

// POST: Create a new proceso disciplinario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.empleado_id) {
      return NextResponse.json({ success: false, error: "Empleado es requerido" }, { status: 400 })
    }

    if (!body.causal) {
      return NextResponse.json({ success: false, error: "Causal es requerida" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("procesos_disciplinarios")
      .insert([{
        empleado_id: body.empleado_id,
        causal: body.causal,
        resultado: body.resultado || null,
        fecha_sancion: body.fecha_sancion || new Date().toISOString().split("T")[0],
        url_documento: body.url_documento || null,
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error creating proceso disciplinario:", error)
    return NextResponse.json({ success: false, error: "Error al registrar proceso" }, { status: 500 })
  }
}
