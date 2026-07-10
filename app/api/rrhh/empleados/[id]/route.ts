import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from("empleados")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error fetching empleado:", error)
    return NextResponse.json({ success: false, error: "Error al cargar empleado" }, { status: 500 })
  }
}

// Coerce empty strings to null. Postgres rejects "" for typed columns
// (date, numeric, etc.) which was causing the 22007 "invalid input syntax
// for type date" error when the form submitted an unfilled fecha_ingreso.
const emptyToNull = <T,>(val: T): T | null => {
  if (val === undefined || val === null) return null
  if (typeof val === "string" && val.trim() === "") return null
  return val
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { data, error } = await supabase
      .from("empleados")
      .update({
        identificacion: emptyToNull(body.identificacion),
        nombre_completo: emptyToNull(body.nombre_completo),
        puesto: emptyToNull(body.puesto),
        direccion: emptyToNull(body.direccion),
        empresa: emptyToNull(body.empresa),
        correo_personal: emptyToNull(body.correo_personal),
        fecha_ingreso: emptyToNull(body.fecha_ingreso),
        tipo_pago: emptyToNull(body.tipo_pago),
        salario_base: body.salario_base === "" || body.salario_base === null || body.salario_base === undefined
          ? 0
          : Number(body.salario_base),
        viaticos_transporte: body.viaticos_transporte === "" || body.viaticos_transporte === null || body.viaticos_transporte === undefined
          ? 0
          : Number(body.viaticos_transporte),
        seguro: body.seguro === "" || body.seguro === null || body.seguro === undefined
          ? 0
          : Number(body.seguro),
        activo: body.activo,
        url_cv: emptyToNull(body.url_cv),
        url_antecedentes_policiales: emptyToNull(body.url_antecedentes_policiales),
        url_antecedentes_penales: emptyToNull(body.url_antecedentes_penales),
        url_dni: emptyToNull(body.url_dni),
        url_licencia: emptyToNull(body.url_licencia),
        url_solicitud_empleo: emptyToNull(body.url_solicitud_empleo),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error updating empleado:", error)
    return NextResponse.json({ success: false, error: "Error al actualizar empleado" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error } = await supabase
      .from("empleados")
      .delete()
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting empleado:", error)
    return NextResponse.json({ success: false, error: "Error al eliminar empleado" }, { status: 500 })
  }
}
