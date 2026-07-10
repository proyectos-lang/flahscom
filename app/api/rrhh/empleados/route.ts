import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activo = searchParams.get("activo")

    let query = supabase
      .from("empleados")
      .select("*")
      .order("nombre_completo", { ascending: true })

    // Filter by activo if specified
    if (activo === "true") {
      query = query.eq("activo", true)
    } else if (activo === "false") {
      query = query.eq("activo", false)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error("Error fetching empleados:", error)
    return NextResponse.json({ success: false, error: "Error al cargar empleados" }, { status: 500 })
  }
}

// Coerce empty strings to null. Postgres rejects "" for typed columns
// (date, numeric, etc.) so an unfilled fecha_ingreso would crash the insert.
const emptyToNull = <T,>(val: T): T | null => {
  if (val === undefined || val === null) return null
  if (typeof val === "string" && val.trim() === "") return null
  return val
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from("empleados")
      .insert([{
        identificacion: emptyToNull(body.identificacion),
        nombre_completo: emptyToNull(body.nombre_completo),
        puesto: emptyToNull(body.puesto),
        direccion: emptyToNull(body.direccion),
        empresa: emptyToNull(body.empresa) || "FLASHCOM",
        correo_personal: emptyToNull(body.correo_personal),
        fecha_ingreso: emptyToNull(body.fecha_ingreso),
        tipo_pago: emptyToNull(body.tipo_pago) || "quincenal",
        salario_base: body.salario_base === "" || body.salario_base === null || body.salario_base === undefined
          ? 0
          : Number(body.salario_base),
        viaticos_transporte: body.viaticos_transporte === "" || body.viaticos_transporte === null || body.viaticos_transporte === undefined
          ? 0
          : Number(body.viaticos_transporte),
        seguro: body.seguro === "" || body.seguro === null || body.seguro === undefined
          ? 0
          : Number(body.seguro),
        activo: body.activo ?? true,
        url_cv: emptyToNull(body.url_cv),
        url_antecedentes_policiales: emptyToNull(body.url_antecedentes_policiales),
        url_antecedentes_penales: emptyToNull(body.url_antecedentes_penales),
        url_dni: emptyToNull(body.url_dni),
        url_licencia: emptyToNull(body.url_licencia),
        url_solicitud_empleo: emptyToNull(body.url_solicitud_empleo),
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error creating empleado:", error)
    return NextResponse.json({ success: false, error: "Error al crear empleado" }, { status: 500 })
  }
}
