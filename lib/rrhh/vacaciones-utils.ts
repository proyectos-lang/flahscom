// Utilities for the Vacaciones module based on Honduran labor law.
// Shared between the API route (POST validation) and the UI page.

/**
 * Days of vacation legally accrued based on completed years of service.
 * Honduras Labor Law:
 *   - 1 completed year  -> 10 days
 *   - 2 completed years -> 12 days
 *   - 3 completed years -> 15 days
 *   - 4+ completed years -> 20 days
 *   - less than 1 year   -> 0 days (not yet entitled)
 */
export function getDiasAcumuladosByAnios(aniosCompletos: number): number {
  if (aniosCompletos >= 4) return 20
  if (aniosCompletos === 3) return 15
  if (aniosCompletos === 2) return 12
  if (aniosCompletos === 1) return 10
  return 0
}

/**
 * Compute full years and remaining months between `fechaIngreso` and today.
 * Returns structured values plus a human friendly Spanish text.
 */
export function calcularAntiguedad(fechaIngreso: string | null | undefined): {
  aniosCompletos: number
  mesesRestantes: number
  texto: string
} {
  if (!fechaIngreso) {
    return { aniosCompletos: 0, mesesRestantes: 0, texto: "-" }
  }

  const ingreso = new Date(fechaIngreso)
  if (isNaN(ingreso.getTime())) {
    return { aniosCompletos: 0, mesesRestantes: 0, texto: "-" }
  }

  const hoy = new Date()
  let anios = hoy.getFullYear() - ingreso.getFullYear()
  let meses = hoy.getMonth() - ingreso.getMonth()
  const dias = hoy.getDate() - ingreso.getDate()

  if (dias < 0) meses -= 1
  if (meses < 0) {
    anios -= 1
    meses += 12
  }
  if (anios < 0) {
    anios = 0
    meses = 0
  }

  const aText = anios === 1 ? "1 ano" : `${anios} anos`
  const mText = meses === 1 ? "1 mes" : `${meses} meses`
  return {
    aniosCompletos: anios,
    mesesRestantes: meses,
    texto: anios === 0 ? mText : `${aText} ${mText}`,
  }
}

/**
 * Next anniversary date (YYYY-MM-DD) of the employee.
 * When the employee credits new vacation days.
 */
export function calcularProximoAniversario(fechaIngreso: string | null | undefined): string {
  if (!fechaIngreso) return "-"
  const ingreso = new Date(fechaIngreso)
  if (isNaN(ingreso.getTime())) return "-"

  const hoy = new Date()
  const next = new Date(ingreso)
  // Set next anniversary year to current year
  next.setFullYear(hoy.getFullYear())
  // If it already passed this year, move to next year
  if (next.getTime() < hoy.getTime()) {
    next.setFullYear(hoy.getFullYear() + 1)
  }
  return next.toISOString().split("T")[0]
}

/**
 * Compute the full balance for an employee given the list of vacation
 * requests. Only APPROVED requests count as "tomados".
 */
export function calcularSaldoEmpleado(
  fechaIngreso: string | null | undefined,
  vacacionesEmpleado: Array<{ estado: string; dias_solicitados: number }>,
): {
  diasAcumulados: number
  diasTomados: number
  diasPendientes: number
  aniosCompletos: number
} {
  const { aniosCompletos } = calcularAntiguedad(fechaIngreso)
  const diasAcumulados = getDiasAcumuladosByAnios(aniosCompletos)
  const diasTomados = vacacionesEmpleado
    .filter((v) => v.estado === "aprobada")
    .reduce((sum, v) => sum + (Number(v.dias_solicitados) || 0), 0)
  const diasPendientes = Math.max(0, diasAcumulados - diasTomados)
  return { diasAcumulados, diasTomados, diasPendientes, aniosCompletos }
}

/**
 * Color classification for the pending-days badge.
 * - high (>= 15)    -> red (action required)
 * - medium (>= 5)   -> amber
 * - low (< 5)       -> green
 */
export function clasificarSaldo(diasPendientes: number): "high" | "medium" | "low" | "none" {
  if (diasPendientes <= 0) return "none"
  if (diasPendientes >= 15) return "high"
  if (diasPendientes >= 5) return "medium"
  return "low"
}
