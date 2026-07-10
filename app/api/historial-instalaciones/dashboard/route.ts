import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get("mes") || new Date().toISOString().slice(0, 7) // YYYY-MM format

    const supabase = await getSupabaseServerClient()

    // Get start and end of month
    const [year, month] = mes.split("-").map(Number)
    const startDate = `${mes}-01`
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10) // Last day of month

    // Get all installations for the month with cuadrilla and contract info
    const { data: instalaciones, error } = await supabase
      .from("instalaciones")
      .select(`
        id,
        contrato_id,
        cuadrilla_id,
        estatus_instalacion,
        fecha_programada,
        fecha_real_instalacion,
        hora_inicio,
        hora_fin,
        created_at,
        cuadrillas (
          id,
          nombre_cuadrilla,
          lider_nombre
        ),
        contratos (
          id,
          clientes (
            nombre_completo
          )
        )
      `)
      .gte("fecha_programada", startDate)
      .lte("fecha_programada", endDate)
      .order("fecha_programada", { ascending: true })

    if (error) {
      console.error("[v0] Dashboard error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Process data for dashboard metrics
    const data = instalaciones || []

    // 1. Installations by day
    const porDia: Record<string, { total: number; instaladas: number; fallidas: number; pendientes: number }> = {}
    
    // Initialize all days of the month
    for (let d = 1; d <= new Date(year, month, 0).getDate(); d++) {
      const dateStr = `${mes}-${String(d).padStart(2, "0")}`
      porDia[dateStr] = { total: 0, instaladas: 0, fallidas: 0, pendientes: 0 }
    }

    // 2. By cuadrilla stats
    const porCuadrilla: Record<number, {
      id: number
      nombre: string
      lider: string
      total: number
      instaladas: number
      fallidas: number
      pendientes: number
      tiemposTotales: number[]
    }> = {}

    // 3. Calculate durations and aggregate
    let totalDuraciones: number[] = []
    const actividadReciente: Array<{
      tipo: "nueva" | "finalizada" | "fallida" | "en_proceso"
      instalacion_id: number
      contrato_id: number
      cliente: string
      cuadrilla: string
      fecha: string
      hora: string
    }> = []

    data.forEach((inst: any) => {
      const fecha = inst.fecha_programada
      
      // Por dia
      if (porDia[fecha]) {
        porDia[fecha].total++
        if (inst.estatus_instalacion === "instalado") porDia[fecha].instaladas++
        else if (inst.estatus_instalacion === "fallido") porDia[fecha].fallidas++
        else porDia[fecha].pendientes++
      }

      // Por cuadrilla
      const cuadrillaId = inst.cuadrilla_id
      if (cuadrillaId) {
        if (!porCuadrilla[cuadrillaId]) {
          porCuadrilla[cuadrillaId] = {
            id: cuadrillaId,
            nombre: inst.cuadrillas?.nombre_cuadrilla || `Cuadrilla ${cuadrillaId}`,
            lider: inst.cuadrillas?.lider_nombre || "Sin lider",
            total: 0,
            instaladas: 0,
            fallidas: 0,
            pendientes: 0,
            tiemposTotales: [],
          }
        }
        porCuadrilla[cuadrillaId].total++
        if (inst.estatus_instalacion === "instalado") porCuadrilla[cuadrillaId].instaladas++
        else if (inst.estatus_instalacion === "fallido") porCuadrilla[cuadrillaId].fallidas++
        else porCuadrilla[cuadrillaId].pendientes++

        // Calculate duration if both times exist
        if (inst.hora_inicio && inst.hora_fin) {
          const [hi, mi] = inst.hora_inicio.split(":").map(Number)
          const [hf, mf] = inst.hora_fin.split(":").map(Number)
          const duracionMinutos = (hf * 60 + mf) - (hi * 60 + mi)
          if (duracionMinutos > 0 && duracionMinutos < 480) { // Max 8 hours
            porCuadrilla[cuadrillaId].tiemposTotales.push(duracionMinutos)
            totalDuraciones.push(duracionMinutos)
          }
        }
      }

      // Actividad reciente (last 20 with status changes)
      const cuadrillaNombre = inst.cuadrillas?.nombre_cuadrilla || "Sin asignar"
      const clienteNombre = inst.contratos?.clientes?.nombre_completo || "Cliente"
      const contratoId = inst.contrato_id || 0
      
      if (inst.estatus_instalacion === "instalado" && inst.hora_fin) {
        actividadReciente.push({
          tipo: "finalizada",
          instalacion_id: inst.id,
          contrato_id: contratoId,
          cliente: clienteNombre,
          cuadrilla: cuadrillaNombre,
          fecha: inst.fecha_real_instalacion || inst.fecha_programada,
          hora: inst.hora_fin,
        })
      } else if (inst.estatus_instalacion === "fallido") {
        actividadReciente.push({
          tipo: "fallida",
          instalacion_id: inst.id,
          contrato_id: contratoId,
          cliente: clienteNombre,
          cuadrilla: cuadrillaNombre,
          fecha: inst.fecha_programada,
          hora: inst.hora_fin || "N/A",
        })
      } else if (inst.estatus_instalacion === "en_proceso") {
        actividadReciente.push({
          tipo: "en_proceso",
          instalacion_id: inst.id,
          contrato_id: contratoId,
          cliente: clienteNombre,
          cuadrilla: cuadrillaNombre,
          fecha: inst.fecha_programada,
          hora: inst.hora_inicio || "N/A",
        })
      } else if (inst.estatus_instalacion === "programada") {
        actividadReciente.push({
          tipo: "nueva",
          instalacion_id: inst.id,
          contrato_id: contratoId,
          cliente: clienteNombre,
          cuadrilla: cuadrillaNombre,
          fecha: inst.fecha_programada,
          hora: "Pendiente",
        })
      }
    })

    // Sort activity by date desc and limit to 30
    actividadReciente.sort((a, b) => {
      const dateA = new Date(`${a.fecha}T${a.hora === "Pendiente" || a.hora === "N/A" ? "00:00:00" : a.hora}`)
      const dateB = new Date(`${b.fecha}T${b.hora === "Pendiente" || b.hora === "N/A" ? "00:00:00" : b.hora}`)
      return dateB.getTime() - dateA.getTime()
    })

    // Calculate averages
    const promedioDuracionGeneral = totalDuraciones.length > 0 
      ? Math.round(totalDuraciones.reduce((a, b) => a + b, 0) / totalDuraciones.length) 
      : 0

    // Add average to each cuadrilla
    const cuadrillasArray = Object.values(porCuadrilla).map(c => ({
      ...c,
      promedioDuracion: c.tiemposTotales.length > 0 
        ? Math.round(c.tiemposTotales.reduce((a, b) => a + b, 0) / c.tiemposTotales.length)
        : 0,
      tiemposTotales: undefined, // Don't send raw data
    })).sort((a, b) => b.total - a.total)

    // Summary stats
    const totalInstalaciones = data.length
    const instaladas = data.filter((i: any) => i.estatus_instalacion === "instalado").length
    const fallidas = data.filter((i: any) => i.estatus_instalacion === "fallido").length
    const pendientes = data.filter((i: any) => ["programada", "en_ruta", "en_proceso"].includes(i.estatus_instalacion)).length
    const tasaExito = totalInstalaciones > 0 ? Math.round((instaladas / totalInstalaciones) * 100) : 0

    // Ordenes reiterativas: fallas agrupadas por tipo_falla en el mes
    // Usamos created_at (fecha de ingreso) para el rango del mes
    const startDateTime = `${startDate}T00:00:00`
    const endDateTime = `${endDate}T23:59:59`

    const { data: fallasMes, error: fallasError } = await supabase
      .from("fallas")
      .select("tipo_falla, created_at, fecha_real_resolucion")
      .gte("created_at", startDateTime)
      .lte("created_at", endDateTime)

    if (fallasError) {
      console.error("[v0] Error fetching fallas for dashboard:", fallasError)
    }

    const tipoFallaCounts: Record<string, number> = {}
    // Fallas grouped by day (YYYY-MM-DD). Pre-initialize with 0 for every day
    // of the month so the chart renders an even x-axis even on quiet days.
    const fallasPorDia: Record<string, number> = {}
    for (let d = 1; d <= new Date(year, month, 0).getDate(); d++) {
      const dateStr = `${mes}-${String(d).padStart(2, "0")}`
      fallasPorDia[dateStr] = 0
    }

    ;(fallasMes || []).forEach((f: any) => {
      const tipo = (f.tipo_falla && String(f.tipo_falla).trim()) || "Sin tipo"
      tipoFallaCounts[tipo] = (tipoFallaCounts[tipo] || 0) + 1

      // Use created_at (when the falla was reported) as the day axis for the bar chart.
      // We filter the query by created_at so this is the canonical "ingreso" date.
      const rawDate = f.created_at as string | null
      if (rawDate) {
        const day = String(rawDate).slice(0, 10)
        if (fallasPorDia[day] !== undefined) {
          fallasPorDia[day] += 1
        }
      }
    })

    const ordenesReiterativas = Object.entries(tipoFallaCounts)
      .map(([tipo, total]) => ({ tipo, total }))
      .sort((a, b) => b.total - a.total)

    const fallasPorDiaArray = Object.entries(fallasPorDia)
      .map(([fecha, total]) => ({ fecha, total }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))

    return NextResponse.json({
      success: true,
      mes,
      resumen: {
        totalInstalaciones,
        instaladas,
        fallidas,
        pendientes,
        tasaExito,
        promedioDuracionMinutos: promedioDuracionGeneral,
      },
      porDia: Object.entries(porDia).map(([fecha, stats]) => ({ fecha, ...stats })),
      porCuadrilla: cuadrillasArray,
      actividadReciente: actividadReciente.slice(0, 30),
      ordenesReiterativas,
      fallasPorDia: fallasPorDiaArray,
    })
  } catch (error: any) {
    console.error("[v0] Dashboard error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
