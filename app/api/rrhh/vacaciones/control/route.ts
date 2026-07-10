import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/rrhh/vacaciones/control
// Reads the historical accrual view vw_control_vacaciones. This view computes
// the TOTAL accrued days across the employee's whole tenure (dias_acumulados_ley)
// and the total approved days taken (dias_tomados), fixing the old bug where the
// app only ever looked at a single year band. The net pending balance is derived
// here as dias_acumulados_ley - dias_tomados so every consumer uses the same rule.
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("vw_control_vacaciones")
      .select("*")

    if (error) throw error

    const rows = (data || []).map((r: any) => {
      // The view may key the employee as empleado_id or id depending on how it
      // was defined; accept either so the UI mapping stays robust.
      const empleadoId = Number(r.empleado_id ?? r.id)
      const diasAcumulados = Number(r.dias_acumulados_ley ?? 0)
      const diasTomados = Number(r.dias_tomados ?? 0)
      // The view already derives dias_pendientes; fall back to the subtraction
      // only if the column is absent so the UI always has a net balance.
      const diasPendientes =
        r.dias_pendientes != null ? Number(r.dias_pendientes) : diasAcumulados - diasTomados
      return {
        empleado_id: empleadoId,
        nombre_completo: r.nombre_completo ?? null,
        anos_antiguedad: r.anos_antiguedad != null ? Number(r.anos_antiguedad) : null,
        fecha_ingreso: r.fecha_ingreso ?? null,
        dias_acumulados_ley: diasAcumulados,
        dias_tomados: diasTomados,
        dias_pendientes: diasPendientes,
      }
    })

    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error("Error fetching vw_control_vacaciones:", error)
    return NextResponse.json(
      { success: false, error: "Error al cargar control de vacaciones" },
      { status: 500 },
    )
  }
}
