import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0]

    // Get employee counts
    const { data: empleados } = await supabase
      .from("empleados")
      .select("id, activo")

    const totalEmpleados = empleados?.length || 0
    const empleadosActivos = empleados?.filter(e => e.activo === true).length || 0
    const empleadosInactivos = empleados?.filter(e => e.activo !== true).length || 0

    // Get today's attendance
    const { data: asistencias, error: asistenciasError } = await supabase
      .from("asistencias")
      .select("id, empleado_id, tipo")
      .eq("fecha", today)

    if (asistenciasError) {
      console.error("Error fetching asistencias:", asistenciasError)
    }

    const asistenciasHoy = asistencias?.filter(a => a.tipo === "asistencia").length || 0
    const faltasHoy = asistencias?.filter(a => a.tipo === "falta").length || 0
    const permisosHoy = asistencias?.filter(a => a.tipo === "permiso" || a.tipo === "incapacidad").length || 0
    const ausenciasHoy = faltasHoy + permisosHoy

    // Get active vacations
    const { data: vacaciones } = await supabase
      .from("vacaciones")
      .select("id")
      .eq("estado", "aprobada")
      .lte("fecha_inicio", today)
      .gte("fecha_fin", today)

    const vacacionesActivas = vacaciones?.length || 0

    // Get monthly payroll estimate (sum of salaries)
    const { data: salarios } = await supabase
      .from("empleados")
      .select("salario_base")
      .eq("activo", true)

    const nominaMensual = salarios?.reduce((sum, e) => sum + (e.salario_base || 0), 0) || 0

    // Get pending evaluations
    const { data: evaluaciones } = await supabase
      .from("evaluaciones")
      .select("id")
      .eq("estado", "pendiente")

    const evaluacionesPendientes = evaluaciones?.length || 0

    // Get recent activity (last 10 employees hired)
    const { data: recentEmployees } = await supabase
      .from("empleados")
      .select("id, nombre_completo, fecha_ingreso")
      .order("fecha_ingreso", { ascending: false })
      .limit(5)

    const actividad = (recentEmployees || []).map(e => ({
      tipo: "ingreso" as const,
      descripcion: `Nuevo ingreso registrado`,
      fecha: e.fecha_ingreso || "",
      empleado: e.nombre_completo || "Empleado",
    }))

    return NextResponse.json({
      success: true,
      stats: {
        totalEmpleados,
        empleadosActivos,
        empleadosInactivos,
        asistenciasHoy,
        ausenciasHoy,
        vacacionesActivas,
        nominaMensual,
        evaluacionesPendientes,
      },
      actividad,
    })
  } catch (error) {
    console.error("Error loading RRHH dashboard:", error)
    return NextResponse.json({
      success: true,
      stats: {
        totalEmpleados: 0,
        empleadosActivos: 0,
        empleadosInactivos: 0,
        asistenciasHoy: 0,
        ausenciasHoy: 0,
        vacacionesActivas: 0,
        nominaMensual: 0,
        evaluacionesPendientes: 0,
      },
      actividad: [],
    })
  }
}
