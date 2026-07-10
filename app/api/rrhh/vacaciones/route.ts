import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { calcularSaldoEmpleado } from "@/lib/rrhh/vacaciones-utils"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("vacaciones")
      .select("*")
      .order("fecha_solicitud", { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error("Error fetching vacaciones:", error)
    return NextResponse.json({ success: false, error: "Error al cargar vacaciones" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Basic field validation
    if (!body.empleado_id || !body.fecha_inicio || !body.fecha_fin || !body.dias_solicitados) {
      return NextResponse.json(
        { success: false, error: "Faltan campos obligatorios" },
        { status: 400 },
      )
    }

    const { data: empleado, error: empError } = await supabase
      .from("empleados")
      .select("fecha_ingreso, nombre_completo")
      .eq("id", body.empleado_id)
      .single()

    if (empError || !empleado) {
      return NextResponse.json(
        { success: false, error: "Empleado no encontrado" },
        { status: 404 },
      )
    }

    // Validate days requested against the HISTORICAL accrued balance from the
    // vw_control_vacaciones view (dias_acumulados_ley across all years minus
    // dias_tomados). Falls back to the single-year util only if the employee
    // has no row in the view yet.
    const { data: controlRow } = await supabase
      .from("vw_control_vacaciones")
      .select("dias_acumulados_ley, dias_tomados")
      .eq("empleado_id", body.empleado_id)
      .maybeSingle()

    let diasAcumulados: number
    let diasPendientes: number

    if (controlRow) {
      diasAcumulados = Number(controlRow.dias_acumulados_ley ?? 0)
      const diasTomados = Number(controlRow.dias_tomados ?? 0)
      diasPendientes = diasAcumulados - diasTomados
    } else {
      const { data: prevVacaciones } = await supabase
        .from("vacaciones")
        .select("estado, dias_solicitados")
        .eq("empleado_id", body.empleado_id)
      const saldo = calcularSaldoEmpleado(empleado.fecha_ingreso, prevVacaciones || [])
      diasAcumulados = saldo.diasAcumulados
      diasPendientes = saldo.diasPendientes
    }

    if (diasAcumulados === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `${empleado.nombre_completo} aun no ha cumplido 1 ano de servicio, no tiene derecho a vacaciones todavia.`,
        },
        { status: 400 },
      )
    }

    if (Number(body.dias_solicitados) > diasPendientes) {
      return NextResponse.json(
        {
          success: false,
          error: `Los dias solicitados (${body.dias_solicitados}) exceden el saldo pendiente del empleado (${diasPendientes} dias disponibles).`,
        },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from("vacaciones")
      .insert([{
        empleado_id: body.empleado_id,
        fecha_inicio: body.fecha_inicio,
        fecha_fin: body.fecha_fin,
        dias_solicitados: body.dias_solicitados,
        motivo: body.motivo,
        estado: "pendiente",
        fecha_solicitud: new Date().toISOString().split("T")[0],
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error creating vacacion:", error)
    return NextResponse.json({ success: false, error: "Error al crear solicitud" }, { status: 500 })
  }
}
