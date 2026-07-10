import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Adds `months` calendar months to a YYYY-MM-DD date without timezone drift.
// We pin the day to the 1st day of the resulting month to avoid Feb/30-31 edge cases.
function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const base = new Date(Date.UTC(y, (m - 1) + months, 1))
  // Try to keep the original day-of-month when it still fits the target month
  const targetYear = base.getUTCFullYear()
  const targetMonth = base.getUTCMonth()
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const day = Math.min(d, lastDay)
  const result = new Date(Date.UTC(targetYear, targetMonth, day))
  return result.toISOString().slice(0, 10)
}

// GET - List agreements, optionally filtered by estado (default: En curso)
// Each returned agreement includes derived progress: cuotas_pagadas, cuotas_totales, saldo_pendiente.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const estado = searchParams.get("estado") // "En curso" | "Finalizado" | null (all)

    // NOTE: We intentionally avoid PostgREST's embedded resource syntax
    // ("empleados!fk_name (...)") because Supabase's schema cache sometimes
    // can't resolve the FK by hint, returning PGRST200. Instead we fetch
    // both tables independently and stitch them together in memory.
    let query = supabase
      .from("prestaciones_acuerdos")
      .select("*")
      .order("created_at", { ascending: false })

    if (estado) query = query.eq("estado", estado)

    const { data: acuerdos, error } = await query
    if (error) throw error

    // Bulk-load referenced empleados once.
    const empleadoIds = Array.from(
      new Set(
        (acuerdos || [])
          .map((a: any) => a.empleado_id)
          .filter((id: any) => id !== null && id !== undefined),
      ),
    ) as number[]

    let empleadosById: Record<number, any> = {}
    if (empleadoIds.length > 0) {
      const { data: empleados, error: empErr } = await supabase
        .from("empleados")
        .select("id, nombre_completo, identificacion, empresa, activo")
        .in("id", empleadoIds)
      if (empErr) throw empErr
      for (const e of empleados || []) empleadosById[e.id] = e
    }

    // Fetch all pagos for the agreements in one query and aggregate in memory
    const acuerdoIds = (acuerdos || []).map((a: any) => a.id)
    let pagosByAcuerdo: Record<number, { pagadas: number; total: number }> = {}

    if (acuerdoIds.length > 0) {
      const { data: pagos, error: pagosError } = await supabase
        .from("prestaciones_pagos")
        .select("acuerdo_id, estado")
        .in("acuerdo_id", acuerdoIds)

      if (pagosError) throw pagosError

      for (const p of pagos || []) {
        const bucket = pagosByAcuerdo[p.acuerdo_id] || { pagadas: 0, total: 0 }
        bucket.total += 1
        if (p.estado === "Pagado") bucket.pagadas += 1
        pagosByAcuerdo[p.acuerdo_id] = bucket
      }
    }

    const enriched = (acuerdos || []).map((a: any) => {
      const stats = pagosByAcuerdo[a.id] || { pagadas: 0, total: a.numero_cuotas }
      const saldoPendiente = Number(a.monto_total) - (stats.pagadas * Number(a.monto_por_cuota))
      return {
        ...a,
        // Manually stitched empleado for the UI to render name/cedula.
        empleados: a.empleado_id ? empleadosById[a.empleado_id] || null : null,
        // Expose both names so the UI can read `cuotas_totales` (rendered count)
        // and consumers can also rely on the canonical schema column.
        cantidad_cuotas: a.numero_cuotas,
        cuotas_pagadas: stats.pagadas,
        cuotas_totales: stats.total || a.numero_cuotas,
        saldo_pendiente: Number(saldoPendiente.toFixed(2)),
      }
    })

    return NextResponse.json({ success: true, data: enriched })
  } catch (err: any) {
    console.error("[v0] Error GET prestaciones-acuerdos:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// POST - Create an agreement and generate all cuotas in prestaciones_pagos
//
// Column names follow the canonical prestaciones_acuerdos schema:
//   numero_cuotas, fecha_acuerdo, urlacuerdo (no underscore in DB).
// The ex-employee is identified by manual nombre + identificacion fields
// stored in nombre_ex_empleado / identificacion_ex_empleado (added via SQL).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      nombre_ex_empleado,
      identificacion_ex_empleado,
      // Accept either name from the client (we send the canonical one from the UI now)
      urlacuerdo,
      url_acuerdo,
      monto_total,
      // Accept both names for backwards compatibility with older clients
      numero_cuotas,
      cantidad_cuotas,
      fecha_acuerdo,
      fecha_primer_pago,
    } = body

    const cuotasInput = numero_cuotas ?? cantidad_cuotas
    const fechaInput = fecha_acuerdo ?? fecha_primer_pago
    const urlInput = urlacuerdo ?? url_acuerdo ?? null

    if (
      !nombre_ex_empleado ||
      !identificacion_ex_empleado ||
      !monto_total ||
      !cuotasInput ||
      !fechaInput
    ) {
      return NextResponse.json(
        { success: false, error: "Faltan campos obligatorios" },
        { status: 400 },
      )
    }

    const montoTotalNum = Number(monto_total)
    const cuotasNum = Number(cuotasInput)
    if (montoTotalNum <= 0 || cuotasNum <= 0 || !Number.isInteger(cuotasNum)) {
      return NextResponse.json(
        { success: false, error: "Monto y cuotas deben ser valores positivos" },
        { status: 400 },
      )
    }

    // Round to 2 decimals; the last installment absorbs the residual so that
    // the sum of cuotas matches monto_total exactly (avoids rounding drift).
    const montoPorCuota = Number((montoTotalNum / cuotasNum).toFixed(2))

    // 1. Resolve / create the empleado record for this ex-employee.
    // The canonical prestaciones_acuerdos schema only stores empleado_id, so
    // we persist the manual name/identificacion in the empleados table.
    // - If an empleado already exists with the given identificacion, reuse it
    //   (and refresh its name in case of typos).
    // - Otherwise, create a new inactive empleado record with just the basics.
    const nombreClean = String(nombre_ex_empleado).trim()
    const identClean = String(identificacion_ex_empleado).trim()

    let empleadoId: number | null = null
    const { data: existingEmp, error: findErr } = await supabase
      .from("empleados")
      .select("id")
      .eq("identificacion", identClean)
      .maybeSingle()
    if (findErr) throw findErr

    if (existingEmp?.id) {
      empleadoId = existingEmp.id
      // Keep the name in sync (optional, ignore errors).
      await supabase
        .from("empleados")
        .update({ nombre_completo: nombreClean, activo: false })
        .eq("id", existingEmp.id)
    } else {
      const { data: newEmp, error: newEmpErr } = await supabase
        .from("empleados")
        .insert({
          identificacion: identClean,
          nombre_completo: nombreClean,
          empresa: "FLASHCOM",
          activo: false,
        })
        .select("id")
        .single()
      if (newEmpErr) throw newEmpErr
      empleadoId = newEmp.id
    }

    // 2. Insert master agreement using the real schema column names.
    const { data: acuerdo, error: acuerdoError } = await supabase
      .from("prestaciones_acuerdos")
      .insert({
        empleado_id: empleadoId,
        urlacuerdo: urlInput,
        monto_total: montoTotalNum,
        numero_cuotas: cuotasNum,
        monto_por_cuota: montoPorCuota,
        fecha_acuerdo: fechaInput,
        estado: "En curso",
      })
      .select()
      .single()

    if (acuerdoError) throw acuerdoError

    // 3. Build all cuotas. Last cuota absorbs rounding residual so total matches.
    // Column name in prestaciones_pagos is `monto_cuota` per the canonical schema.
    const cuotas: Array<{
      acuerdo_id: number
      numero_cuota: number
      monto_cuota: number
      fecha_programada: string
      estado: string
    }> = []

    let acumulado = 0
    for (let i = 0; i < cuotasNum; i++) {
      const esUltima = i === cuotasNum - 1
      let montoCuota = montoPorCuota
      if (esUltima) {
        montoCuota = Number((montoTotalNum - acumulado).toFixed(2))
      }
      acumulado += montoCuota
      cuotas.push({
        acuerdo_id: acuerdo.id,
        numero_cuota: i + 1,
        monto_cuota: montoCuota,
        fecha_programada: addMonths(fechaInput, i),
        estado: "Pendiente",
      })
    }

    const { error: pagosError } = await supabase
      .from("prestaciones_pagos")
      .insert(cuotas)

    if (pagosError) {
      // Rollback the master agreement if we can't generate the installments
      await supabase.from("prestaciones_acuerdos").delete().eq("id", acuerdo.id)
      throw pagosError
    }

    // The ex-employee is captured manually now, so there is no employee
    // record to auto-deactivate.

    return NextResponse.json({ success: true, data: acuerdo })
  } catch (err: any) {
    console.error("[v0] Error POST prestaciones-acuerdos:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
