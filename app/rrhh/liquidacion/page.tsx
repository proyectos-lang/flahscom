"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import * as XLSX from "xlsx"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Calculator, 
  Calendar, 
  Save, 
  FileText, 
  Users, 
  DollarSign,
  Loader2,
  Building2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Search,
  X,
  Check,
  History,
  Eye,
  ChevronRight,
  Trash2,
  FileSpreadsheet,
} from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { jsPDF } from "jspdf"
import { Switch } from "@/components/ui/switch"

interface Empleado {
  id: number
  nombre_completo: string
  empresa: string
  valor_dia: number
  viaticos_transporte: number
  tipo_pago: "quincenal" | "mensual"
  // Monthly insurance deduction. Applied to a single quincena depending on
  // the employee's payment type (see the calc loop for the exact rule).
  seguro: number
}

interface DetalleDescuento {
  concepto: string
  monto: number
}

interface PreLiquidacionRow {
  empleado_id: number
  nombre_completo: string
  empresa: string
  tipo_pago: "quincenal" | "mensual"
  dias_laborados: number
  valor_dia: number
  viaticos_transporte: number
  total_adelantos: number
  total_deducciones: number
  adelanto_1q_aplicado: boolean
  detalle_descuentos: DetalleDescuento[]
}

interface Nomina {
  id: number
  periodo: string
  descripcion: string
  estado: string
  fecha_inicio: string
  fecha_fin: string
  total_bruto: number
  total_deducciones: number
  total_neto: number
  created_at: string
}

interface PeriodoNomina {
  id: number
  nomina_id: number
  empleado_id: number
  fecha_inicio: string
  fecha_fin: string
  dias_laborados: number
  salario_devengado: number
  viaticos: number
  total_deducciones: number
  neto_pagado: number
  nombre_completo?: string
  empresa?: string
}

export default function LiquidacionPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [calculated, setCalculated] = useState(false)
  
  // Filter state
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")
  const [filterEmpleadoId, setFilterEmpleadoId] = useState<number | null>(null)
  const [filterEmpresa, setFilterEmpresa] = useState<string>("")
  const [openEmpleadoCombobox, setOpenEmpleadoCombobox] = useState(false)
  const [openEmpresaCombobox, setOpenEmpresaCombobox] = useState(false)

  // Payment control switches
  const [pagarViaticos, setPagarViaticos] = useState(true)
  const [primeraQuincena, setPrimeraQuincena] = useState(false)
  const [segundaQuincena, setSegundaQuincena] = useState(false)
  
  // Data state
  const [rows, setRows] = useState<PreLiquidacionRow[]>([])
  const [allEmpleados, setAllEmpleados] = useState<Empleado[]>([])

  // Historial state
  const [nominas, setNominas] = useState<Nomina[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [selectedNomina, setSelectedNomina] = useState<Nomina | null>(null)
  const [periodos, setPeriodos] = useState<PeriodoNomina[]>([])
  const [loadingPeriodos, setLoadingPeriodos] = useState(false)
  const [showDetalleDialog, setShowDetalleDialog] = useState(false)

  // Delete-nomina state: stores the nomina targeted for deletion so the
  // confirmation AlertDialog can show its periodo in the message.
  const [nominaToDelete, setNominaToDelete] = useState<Nomina | null>(null)
  const [deletingNomina, setDeletingNomina] = useState(false)

  // Load historial
  const loadHistorial = useCallback(async () => {
    setLoadingHistorial(true)
    try {
      const res = await fetch("/api/rrhh/liquidacion/historial")
      if (!res.ok) return
      const data = await res.json()
      if (data.success) {
        setNominas(data.data || [])
      }
    } catch (error) {
      console.error("Error loading historial:", error)
    } finally {
      setLoadingHistorial(false)
    }
  }, [])

  // Load periodos for selected nomina
  const loadPeriodos = useCallback(async (nominaId: number) => {
    setLoadingPeriodos(true)
    try {
      const res = await fetch(`/api/rrhh/liquidacion/historial?nomina_id=${nominaId}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.success) {
        setPeriodos(data.data || [])
      }
    } catch (error) {
      console.error("Error loading periodos:", error)
    } finally {
      setLoadingPeriodos(false)
    }
  }, [])

  useEffect(() => {
    loadHistorial()
  }, [loadHistorial])

  // Calculate payroll
  const handleCalcularNomina = async () => {
    if (!fechaInicio || !fechaFin) {
      toast({ title: "Error", description: "Seleccione las fechas del periodo", variant: "destructive" })
      return
    }

    setLoading(true)
    setCalculated(false)
    
    try {
      // Calculate days in the period (inclusive)
      const startDate = new Date(fechaInicio)
      const endDate = new Date(fechaFin)
      const diffTime = endDate.getTime() - startDate.getTime()
      const diasDelPeriodo = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

      if (diasDelPeriodo < 1) {
        toast({ title: "Error", description: "La fecha fin debe ser mayor o igual a la fecha inicio", variant: "destructive" })
        setLoading(false)
        return
      }

      // Fetch all data in parallel
      const [empleadosRes, deduccionesRes, adelantosRes] = await Promise.all([
        fetch("/api/rrhh/empleados?activo=true"),
        fetch(`/api/rrhh/deducciones?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`),
        fetch(`/api/rrhh/adelantos?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}&estado=aprobada`),
      ])

      const [empleadosData, deduccionesData, adelantosData] = await Promise.all([
        empleadosRes.json(),
        deduccionesRes.json(),
        adelantosRes.json(),
      ])

      if (!empleadosData.success) {
        throw new Error("Error al cargar empleados")
      }

      // Safety net: exclude any employee whose `activo` field is explicitly FALSE.
      // The API already filters with `?activo=true`, but this guards against edge
      // cases where the column stores non-strict values (e.g. null, 0/1, string).
      const rawEmpleados: Empleado[] = empleadosData.data || []
      const empleados: Empleado[] = rawEmpleados.filter((e: any) => {
        const v = e?.activo
        // Exclude strictly inactive values; keep true/null/undefined as active
        return v !== false && v !== "false" && v !== 0 && v !== "0"
      })
      console.log(
        "[v0] Liquidacion: loaded",
        rawEmpleados.length,
        "empleados from API,",
        empleados.length,
        "after filtering inactive"
      )
      setAllEmpleados(empleados)

      // Process deductions per employee with details
      const deducciones = deduccionesData.data || []
      const deduccionesPorEmpleado: Record<number, number> = {}
      const detalleDeduccionesPorEmpleado: Record<number, DetalleDescuento[]> = {}
      deducciones.forEach((d: { empleado_id: number; monto: number; concepto?: string }) => {
        deduccionesPorEmpleado[d.empleado_id] = (deduccionesPorEmpleado[d.empleado_id] || 0) + (d.monto || 0)
        if (!detalleDeduccionesPorEmpleado[d.empleado_id]) {
          detalleDeduccionesPorEmpleado[d.empleado_id] = []
        }
        detalleDeduccionesPorEmpleado[d.empleado_id].push({
          concepto: d.concepto || "Deduccion",
          monto: d.monto || 0
        })
      })

      // Process advances per employee with details
      const adelantos = adelantosData.data || []
      const adelantosPorEmpleado: Record<number, number> = {}
      const detalleAdelantosPorEmpleado: Record<number, DetalleDescuento[]> = {}
      adelantos.forEach((a: { empleado_id: number; monto: number }) => {
        adelantosPorEmpleado[a.empleado_id] = (adelantosPorEmpleado[a.empleado_id] || 0) + (a.monto || 0)
        if (!detalleAdelantosPorEmpleado[a.empleado_id]) {
          detalleAdelantosPorEmpleado[a.empleado_id] = []
        }
        detalleAdelantosPorEmpleado[a.empleado_id].push({
          concepto: "Adelanto de Nomina",
          monto: a.monto || 0
        })
      })

      // Build pre-liquidation rows with special logic for payment types
      const preRows: PreLiquidacionRow[] = empleados.map((emp) => {
        const tipoPago = emp.tipo_pago || "quincenal"
        const viaticosBase = emp.viaticos_transporte || 0
        const valorDia = emp.valor_dia || 0
        let diasLaborados = diasDelPeriodo
        let viaticosFinales = pagarViaticos ? viaticosBase : 0
        let deduccionesBase = deduccionesPorEmpleado[emp.id] || 0
        let adelanto1qAplicado = false

        // Combine all descuentos into one array
        const detalleDescuentos: DetalleDescuento[] = [
          ...(detalleAdelantosPorEmpleado[emp.id] || []),
          ...(detalleDeduccionesPorEmpleado[emp.id] || []),
        ]

        // Apply special rules for MENSUAL employees
        if (tipoPago === "mensual") {
          if (primeraQuincena) {
            diasLaborados = 0
          } else if (segundaQuincena) {
            diasLaborados = 30
            deduccionesBase += 2000
            adelanto1qAplicado = true
            detalleDescuentos.push({
              concepto: "Adelanto 1ra Quincena",
              monto: 2000
            })
          }
        }

        // Insurance deduction:
        //   - Quincenal employees: the insurance is proportional to the part
        //     of the month paid, so we ALWAYS charge half (seguro / 2),
        //     regardless of whether it is the 1st quincena, 2nd quincena, or
        //     the full month. Each quincena = half a month = half the seguro.
        //   - Mensual employees: charged the full amount on the 2nd quincena
        //     (when they actually receive their full pay).
        // Any other combination leaves the deduction at 0.
        const seguroEmpleado = emp.seguro || 0
        let montoSeguro = 0
        if (tipoPago === "quincenal") {
          montoSeguro = seguroEmpleado / 2
        } else if (segundaQuincena && tipoPago === "mensual") {
          montoSeguro = seguroEmpleado
        }

        if (montoSeguro > 0) {
          deduccionesBase += montoSeguro
          detalleDescuentos.push({
            concepto: "Deduccion de Seguro",
            monto: montoSeguro,
          })
        }

        return {
          empleado_id: emp.id,
          nombre_completo: emp.nombre_completo,
          empresa: emp.empresa,
          tipo_pago: tipoPago,
          dias_laborados: diasLaborados,
          valor_dia: valorDia,
          viaticos_transporte: viaticosFinales,
          total_adelantos: adelantosPorEmpleado[emp.id] || 0,
          total_deducciones: deduccionesBase,
          adelanto_1q_aplicado: adelanto1qAplicado,
          detalle_descuentos: detalleDescuentos,
        }
      })

      setRows(preRows)
      setCalculated(true)
      
      toast({ 
        title: "Nomina Calculada", 
        description: `Se procesaron ${empleados.length} empleados con ${diasDelPeriodo} dias del periodo` 
      })
    } catch (error) {
      console.error("Error calculating payroll:", error)
      toast({ title: "Error", description: "Error al calcular la nomina", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Update days worked for an employee
  const handleDiasChange = (empleadoId: number, dias: number) => {
    setRows(rows.map(row => 
      row.empleado_id === empleadoId 
        ? { ...row, dias_laborados: dias }
        : row
    ))
  }

  // Calculate derived values with useMemo for real-time updates
  const calculatedRows = useMemo(() => {
    return rows.map(row => {
      let salarioDevengado: number
      
      if (row.tipo_pago === "mensual" && primeraQuincena && row.dias_laborados === 0) {
        salarioDevengado = 2000
      } else {
        salarioDevengado = row.dias_laborados * row.valor_dia
      }
      
      const netoPagar = salarioDevengado + row.viaticos_transporte - row.total_adelantos - row.total_deducciones
      return {
        ...row,
        salario_devengado: salarioDevengado,
        neto_pagar: netoPagar,
      }
    })
  }, [rows, primeraQuincena])

  // Get unique empresas
  const empresas = useMemo(() => {
    const uniqueEmpresas = [...new Set(allEmpleados.map(e => e.empresa))]
    return uniqueEmpresas.filter(Boolean).sort()
  }, [allEmpleados])

  // Apply filters to calculated rows
  const filteredRows = useMemo(() => {
    return calculatedRows.filter(row => {
      if (filterEmpleadoId && row.empleado_id !== filterEmpleadoId) return false
      if (filterEmpresa && row.empresa !== filterEmpresa) return false
      return true
    })
  }, [calculatedRows, filterEmpleadoId, filterEmpresa])

  // Calculate totals from filtered rows
  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => ({
        diasLaborados: acc.diasLaborados + row.dias_laborados,
        salarioDevengado: acc.salarioDevengado + row.salario_devengado,
        viaticos: acc.viaticos + row.viaticos_transporte,
        adelantos: acc.adelantos + row.total_adelantos,
        deducciones: acc.deducciones + row.total_deducciones,
        netoPagar: acc.netoPagar + row.neto_pagar,
      }),
      { diasLaborados: 0, salarioDevengado: 0, viaticos: 0, adelantos: 0, deducciones: 0, netoPagar: 0 }
    )
  }, [filteredRows])

  // Generate periodo string
  const generatePeriodoString = () => {
    if (!fechaInicio || !fechaFin) return ""
    const start = new Date(fechaInicio)
    const end = new Date(fechaFin)
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
    return `${start.getDate().toString().padStart(2, "0")}-${end.getDate().toString().padStart(2, "0")} ${months[end.getMonth()]} ${end.getFullYear()}`
  }

  // Save payroll
  const handleGuardarNomina = async () => {
    if (!fechaInicio || !fechaFin) {
      toast({ title: "Error", description: "Seleccione las fechas del periodo", variant: "destructive" })
      return
    }

    if (calculatedRows.length === 0) {
      toast({ title: "Error", description: "No hay datos para guardar", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/rrhh/liquidacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodo: generatePeriodoString(),
          descripcion: primeraQuincena ? "1ra Quincena" : segundaQuincena ? "2da Quincena" : "Periodo Regular",
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          total_bruto: totals.salarioDevengado + totals.viaticos,
          total_deducciones: totals.adelantos + totals.deducciones,
          total_neto: totals.netoPagar,
          empleados: calculatedRows.map(row => ({
            empleado_id: row.empleado_id,
            dias_laborados: row.dias_laborados,
            salario_devengado: row.salario_devengado,
            viaticos: row.viaticos_transporte,
            total_deducciones: row.total_adelantos + row.total_deducciones,
            neto_pagado: row.neto_pagar,
          })),
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast({ title: "Exito", description: "Nomina guardada correctamente" })
        // Refresh historial
        await loadHistorial()
        // Reset form
        setCalculated(false)
        setRows([])
        setFechaInicio("")
        setFechaFin("")
      } else {
        toast({ title: "Error", description: data.error || "Error al guardar", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error saving payroll:", error)
      toast({ title: "Error", description: "Error al guardar la nomina", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // View detail of a nomina
  const handleVerDetalle = async (nomina: Nomina) => {
    setSelectedNomina(nomina)
    setShowDetalleDialog(true)
    await loadPeriodos(nomina.id)
  }

  // Delete a nomina (and all its periodos) after the user confirms in the AlertDialog
  const handleDeleteNomina = async () => {
    if (!nominaToDelete) return
    setDeletingNomina(true)
    try {
      const res = await fetch(
        `/api/rrhh/liquidacion/historial/${nominaToDelete.id}`,
        { method: "DELETE" },
      )
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast({
          title: "Error",
          description: data.error || "No se pudo eliminar la nomina",
          variant: "destructive",
        })
        return
      }
      toast({
        title: "Nomina eliminada",
        description: `La nomina "${nominaToDelete.periodo}" fue eliminada correctamente`,
      })
      // If the deleted nomina was open in the detail dialog, close it
      if (selectedNomina?.id === nominaToDelete.id) {
        setShowDetalleDialog(false)
        setSelectedNomina(null)
        setPeriodos([])
      }
      setNominaToDelete(null)
      await loadHistorial()
    } catch (error: any) {
      console.error("[v0] Error deleting nomina:", error)
      toast({
        title: "Error",
        description: error?.message || "Error inesperado al eliminar",
        variant: "destructive",
      })
    } finally {
      setDeletingNomina(false)
    }
  }

  // Tracks which saved nomina is currently being exported so we can show a
  // spinner on the right row's button.
  const [exportingNominaId, setExportingNominaId] = useState<number | null>(null)

  // Export a saved nomina to a real .xlsx workbook so every value lands in its
  // own column/cell (not concatenated text). `periodos` (loaded for the detail
  // view) is reused when the same nomina is open; otherwise we fetch fresh data.
  const handleExportExcel = async (nomina: Nomina) => {
    setExportingNominaId(nomina.id)
    try {
      let detalle: PeriodoNomina[] = []
      if (selectedNomina?.id === nomina.id && periodos.length > 0) {
        detalle = periodos
      } else {
        const res = await fetch(`/api/rrhh/liquidacion/historial?nomina_id=${nomina.id}`)
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || "No se pudieron cargar los detalles")
        }
        detalle = data.data || []
      }

      if (detalle.length === 0) {
        toast({
          title: "Sin datos",
          description: "Esta nomina no tiene empleados para exportar",
          variant: "destructive",
        })
        return
      }

      const round = (n: number) => Math.round((n || 0) * 100) / 100

      // Build the sheet as an Array-of-Arrays so each element is a discrete cell.
      const headers = [
        "Empleado",
        "Empresa",
        "Dias Laborados",
        "Salario Devengado",
        "Viaticos",
        "Total Deducciones",
        "Neto Pagado",
      ]

      const dataRows = detalle.map((p) => [
        p.nombre_completo || `Empleado #${p.empleado_id}`,
        p.empresa || "",
        p.dias_laborados ?? 0,
        round(p.salario_devengado ?? 0),
        round(p.viaticos ?? 0),
        round(p.total_deducciones ?? 0),
        round(p.neto_pagado ?? 0),
      ])

      // Totals row
      const tot = detalle.reduce(
        (acc, p) => ({
          dias: acc.dias + (p.dias_laborados || 0),
          salario: acc.salario + (p.salario_devengado || 0),
          viaticos: acc.viaticos + (p.viaticos || 0),
          deducciones: acc.deducciones + (p.total_deducciones || 0),
          neto: acc.neto + (p.neto_pagado || 0),
        }),
        { dias: 0, salario: 0, viaticos: 0, deducciones: 0, neto: 0 },
      )
      const totalRow = [
        "TOTALES",
        "",
        tot.dias,
        round(tot.salario),
        round(tot.viaticos),
        round(tot.deducciones),
        round(tot.neto),
      ]

      // Metadata block above the table (label in col A, value in col B).
      const aoa: (string | number)[][] = [
        ["Periodo", nomina.periodo || ""],
        ["Descripcion", nomina.descripcion || ""],
        ["Fechas", `${nomina.fecha_inicio} al ${nomina.fecha_fin}`],
        [],
        headers,
        ...dataRows,
        totalRow,
      ]

      const ws = XLSX.utils.aoa_to_sheet(aoa)

      // Column widths for readability.
      ws["!cols"] = [
        { wch: 30 },
        { wch: 20 },
        { wch: 14 },
        { wch: 18 },
        { wch: 14 },
        { wch: 18 },
        { wch: 16 },
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Liquidacion")

      const safePeriodo = (nomina.periodo || `nomina-${nomina.id}`).replace(/[^\w-]+/g, "_")
      XLSX.writeFile(wb, `liquidacion-${safePeriodo}.xlsx`)

      toast({ title: "Exportado", description: "La liquidacion se descargo en Excel" })
    } catch (error: any) {
      console.error("[v0] Error exporting nomina to Excel:", error)
      toast({
        title: "Error",
        description: error?.message || "No se pudo exportar la liquidacion",
        variant: "destructive",
      })
    } finally {
      setExportingNominaId(null)
    }
  }

  // Generate PDF for employee (from current calculation)
  const generatePDF = (row: typeof calculatedRows[0]) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    
    const primaryColor: [number, number, number] = [249, 115, 22]
    const grayColor: [number, number, number] = [107, 114, 128]
    const darkColor: [number, number, number] = [31, 41, 55]

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(0, 0, pageWidth, 45, "F")

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont("helvetica", "bold")
    doc.text(row.empresa.toUpperCase(), 20, 25)
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text("VOLANTE DE PAGO", 20, 35)
    doc.setFontSize(9)
    doc.text(`Periodo: ${fechaInicio} al ${fechaFin}`, pageWidth - 20, 25, { align: "right" })

    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("DATOS DEL EMPLEADO", 20, 60)

    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setLineWidth(0.5)
    doc.line(20, 63, pageWidth - 20, 63)

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.text("Nombre:", 20, 73)
    doc.text("Empresa:", 20, 83)
    doc.text("Dias Laborados:", 20, 93)

    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
    doc.setFont("helvetica", "bold")
    doc.text(row.nombre_completo, 60, 73)
    doc.text(row.empresa, 60, 83)
    doc.text(row.dias_laborados.toString(), 60, 93)

    let yPos = 115
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
    doc.text("INGRESOS", 20, yPos)
    doc.line(20, yPos + 3, pageWidth - 20, yPos + 3)

    yPos += 15
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    
    doc.setFillColor(245, 245, 245)
    doc.rect(20, yPos - 5, pageWidth - 40, 10, "F")
    doc.text("Concepto", 25, yPos)
    doc.text("Monto", pageWidth - 25, yPos, { align: "right" })

    yPos += 12
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.text(`Salario Devengado (${row.dias_laborados} dias x L${row.valor_dia.toLocaleString()})`, 25, yPos)
    doc.setTextColor(34, 197, 94)
    doc.text(`L ${row.salario_devengado.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" })

    yPos += 10
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.text("Viaticos de Transporte", 25, yPos)
    doc.setTextColor(34, 197, 94)
    doc.text(`L ${row.viaticos_transporte.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" })

    yPos += 12
    doc.setFont("helvetica", "bold")
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
    doc.text("Total Ingresos:", 25, yPos)
    doc.setTextColor(34, 197, 94)
    const totalIngresos = row.salario_devengado + row.viaticos_transporte
    doc.text(`L ${totalIngresos.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" })

    yPos += 25
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
    doc.text("DEDUCCIONES", 20, yPos)
    doc.line(20, yPos + 3, pageWidth - 40, yPos + 3)

    yPos += 15
    doc.setFontSize(10)
    
    doc.setFillColor(245, 245, 245)
    doc.rect(20, yPos - 5, pageWidth - 40, 10, "F")
    doc.setFont("helvetica", "normal")
    doc.text("Concepto", 25, yPos)
    doc.text("Monto", pageWidth - 25, yPos, { align: "right" })

    if (row.detalle_descuentos && row.detalle_descuentos.length > 0) {
      row.detalle_descuentos.forEach((descuento) => {
        yPos += 10
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
        doc.text(descuento.concepto, 25, yPos)
        doc.setTextColor(239, 68, 68)
        doc.text(`- L ${descuento.monto.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" })
      })
    } else {
      yPos += 10
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
      doc.text("Sin deducciones", 25, yPos)
      doc.setTextColor(239, 68, 68)
      doc.text("L 0", pageWidth - 25, yPos, { align: "right" })
    }

    yPos += 12
    doc.setFont("helvetica", "bold")
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
    doc.text("Total Deducciones:", 25, yPos)
    doc.setTextColor(239, 68, 68)
    const totalDeducciones = row.total_adelantos + row.total_deducciones
    doc.text(`- L ${totalDeducciones.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" })

    yPos += 25
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(20, yPos - 8, pageWidth - 40, 20, "F")
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("NETO A PAGAR:", 30, yPos + 4)
    doc.setFontSize(16)
    doc.text(`L ${row.neto_pagar.toLocaleString()}`, pageWidth - 30, yPos + 4, { align: "right" })

    yPos += 40
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text("Firma de Recibido:", 20, yPos)
    
    doc.setDrawColor(grayColor[0], grayColor[1], grayColor[2])
    doc.setLineWidth(0.3)
    doc.line(20, yPos + 25, 100, yPos + 25)
    
    doc.text("Fecha:", 120, yPos)
    doc.line(120, yPos + 25, pageWidth - 20, yPos + 25)

    doc.setFontSize(8)
    doc.text(row.nombre_completo, 20, yPos + 30)
    doc.text("____/____/________", 120, yPos + 30)

    doc.setFontSize(8)
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.text("Este documento es un comprobante de pago. Conservelo para sus registros.", pageWidth / 2, 280, { align: "center" })

    const fileName = `Volante_${row.nombre_completo.replace(/\s+/g, "_")}_${fechaInicio}_${fechaFin}.pdf`
    doc.save(fileName)

    toast({ title: "PDF Generado", description: `Volante de ${row.nombre_completo} descargado` })
  }

  // Generate PDF from historial (periodos_nomina data)
  const generatePDFFromHistorial = (periodo: PeriodoNomina) => {
    if (!selectedNomina) return
    
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    
    const primaryColor: [number, number, number] = [249, 115, 22]
    const grayColor: [number, number, number] = [107, 114, 128]
    const darkColor: [number, number, number] = [31, 41, 55]

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(0, 0, pageWidth, 45, "F")

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont("helvetica", "bold")
    doc.text((periodo.empresa || "EMPRESA").toUpperCase(), 20, 25)
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text("VOLANTE DE PAGO (Re-impresion)", 20, 35)
    doc.setFontSize(9)
    doc.text(`Periodo: ${selectedNomina.periodo}`, pageWidth - 20, 25, { align: "right" })

    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("DATOS DEL EMPLEADO", 20, 60)

    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setLineWidth(0.5)
    doc.line(20, 63, pageWidth - 20, 63)

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.text("Nombre:", 20, 73)
    doc.text("Dias Laborados:", 20, 83)

    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
    doc.setFont("helvetica", "bold")
    doc.text(periodo.nombre_completo || `Empleado #${periodo.empleado_id}`, 60, 73)
    doc.text(periodo.dias_laborados.toString(), 60, 83)

    let yPos = 105
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
    doc.text("RESUMEN DE PAGO", 20, yPos)
    doc.line(20, yPos + 3, pageWidth - 20, yPos + 3)

    yPos += 15
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    
    doc.setFillColor(245, 245, 245)
    doc.rect(20, yPos - 5, pageWidth - 40, 10, "F")
    doc.text("Concepto", 25, yPos)
    doc.text("Monto", pageWidth - 25, yPos, { align: "right" })

    yPos += 12
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.text("Salario Devengado", 25, yPos)
    doc.setTextColor(34, 197, 94)
    doc.text(`L ${(periodo.salario_devengado || 0).toLocaleString()}`, pageWidth - 25, yPos, { align: "right" })

    yPos += 10
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.text("Viaticos", 25, yPos)
    doc.setTextColor(34, 197, 94)
    doc.text(`L ${(periodo.viaticos || 0).toLocaleString()}`, pageWidth - 25, yPos, { align: "right" })

    yPos += 10
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.text("Total Deducciones", 25, yPos)
    doc.setTextColor(239, 68, 68)
    doc.text(`- L ${(periodo.total_deducciones || 0).toLocaleString()}`, pageWidth - 25, yPos, { align: "right" })

    yPos += 20
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(20, yPos - 8, pageWidth - 40, 20, "F")
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("NETO PAGADO:", 30, yPos + 4)
    doc.setFontSize(16)
    doc.text(`L ${(periodo.neto_pagado || 0).toLocaleString()}`, pageWidth - 30, yPos + 4, { align: "right" })

    yPos += 40
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text("Firma de Recibido:", 20, yPos)
    
    doc.setDrawColor(grayColor[0], grayColor[1], grayColor[2])
    doc.setLineWidth(0.3)
    doc.line(20, yPos + 25, 100, yPos + 25)
    
    doc.text("Fecha:", 120, yPos)
    doc.line(120, yPos + 25, pageWidth - 20, yPos + 25)

    doc.setFontSize(8)
    doc.text(periodo.nombre_completo || "", 20, yPos + 30)
    doc.text("____/____/________", 120, yPos + 30)

    doc.setFontSize(8)
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.text("Este documento es un comprobante de pago. Conservelo para sus registros.", pageWidth / 2, 280, { align: "center" })

    const fileName = `Volante_${(periodo.nombre_completo || "Empleado").replace(/\s+/g, "_")}_${selectedNomina.periodo.replace(/\s+/g, "_")}.pdf`
    doc.save(fileName)

    toast({ title: "PDF Generado", description: `Volante re-impreso exitosamente` })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Liquidacion de Nomina</h1>
          <p className="text-sm text-gray-500 mt-1">Genere y consulte las planillas de pago</p>
        </div>
      </div>

      <Tabs defaultValue="generar" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="generar" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Generar Nomina
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Generar Nomina */}
        <TabsContent value="generar" className="space-y-6">
          {/* Filter Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Fecha Inicio</Label>
                  <Input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => {
                      setFechaInicio(e.target.value)
                      setCalculated(false)
                    }}
                    className="w-44"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Fecha Fin</Label>
                  <Input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => {
                      setFechaFin(e.target.value)
                      setCalculated(false)
                    }}
                    className="w-44"
                  />
                </div>
                
                <div className="h-8 w-px bg-gray-200" />
                
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <Switch
                    id="pagar-viaticos"
                    checked={pagarViaticos}
                    onCheckedChange={setPagarViaticos}
                  />
                  <Label htmlFor="pagar-viaticos" className="text-xs font-medium cursor-pointer">
                    Pagar Viaticos
                  </Label>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                  <Switch
                    id="primera-quincena"
                    checked={primeraQuincena}
                    onCheckedChange={(checked) => {
                      setPrimeraQuincena(checked)
                      if (checked) setSegundaQuincena(false)
                    }}
                  />
                  <Label htmlFor="primera-quincena" className="text-xs font-medium cursor-pointer">
                    1ra Quincena
                    <span className="block text-[10px] text-gray-500 font-normal">Adelanto L.2000 Mensuales</span>
                  </Label>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-100">
                  <Switch
                    id="segunda-quincena"
                    checked={segundaQuincena}
                    onCheckedChange={(checked) => {
                      setSegundaQuincena(checked)
                      if (checked) setPrimeraQuincena(false)
                    }}
                  />
                  <Label htmlFor="segunda-quincena" className="text-xs font-medium cursor-pointer">
                    2da Quincena
                    <span className="block text-[10px] text-gray-500 font-normal">Liquidar mes -L.2000</span>
                  </Label>
                </div>

                <Button 
                  onClick={handleCalcularNomina}
                  disabled={loading || !fechaInicio || !fechaFin}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Calculator className="w-4 h-4 mr-2" />
                  )}
                  Calcular Nomina
                </Button>

                {calculated && (
                  <>
                    <div className="h-8 w-px bg-gray-200" />
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Filtrar Empleado</Label>
                      <Popover open={openEmpleadoCombobox} onOpenChange={setOpenEmpleadoCombobox}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openEmpleadoCombobox}
                            className="w-56 justify-between h-9"
                          >
                            {filterEmpleadoId ? (
                              <span className="truncate">
                                {allEmpleados.find(e => e.id === filterEmpleadoId)?.nombre_completo}
                              </span>
                            ) : (
                              <span className="text-gray-500">Todos los empleados</span>
                            )}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar empleado..." />
                            <CommandList>
                              <CommandEmpty>No se encontro.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="todos"
                                  onSelect={() => {
                                    setFilterEmpleadoId(null)
                                    setOpenEmpleadoCombobox(false)
                                  }}
                                >
                                  <span>Todos los empleados</span>
                                  {!filterEmpleadoId && <Check className="ml-auto h-4 w-4 text-orange-500" />}
                                </CommandItem>
                                {allEmpleados.map((emp) => (
                                  <CommandItem
                                    key={emp.id}
                                    value={emp.nombre_completo}
                                    onSelect={() => {
                                      setFilterEmpleadoId(emp.id)
                                      setOpenEmpleadoCombobox(false)
                                    }}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">{emp.nombre_completo}</span>
                                      <span className="text-xs text-gray-500">{emp.empresa}</span>
                                    </div>
                                    {filterEmpleadoId === emp.id && <Check className="ml-auto h-4 w-4 text-orange-500" />}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Filtrar Empresa</Label>
                      <Popover open={openEmpresaCombobox} onOpenChange={setOpenEmpresaCombobox}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openEmpresaCombobox}
                            className="w-44 justify-between h-9"
                          >
                            {filterEmpresa ? (
                              <span>{filterEmpresa}</span>
                            ) : (
                              <span className="text-gray-500">Todas</span>
                            )}
                            <Building2 className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-0" align="start">
                          <Command>
                            <CommandList>
                              <CommandGroup>
                                <CommandItem
                                  value="todas"
                                  onSelect={() => {
                                    setFilterEmpresa("")
                                    setOpenEmpresaCombobox(false)
                                  }}
                                >
                                  <span>Todas las empresas</span>
                                  {!filterEmpresa && <Check className="ml-auto h-4 w-4 text-orange-500" />}
                                </CommandItem>
                                {empresas.map((empresa) => (
                                  <CommandItem
                                    key={empresa}
                                    value={empresa}
                                    onSelect={() => {
                                      setFilterEmpresa(empresa)
                                      setOpenEmpresaCombobox(false)
                                    }}
                                  >
                                    <span>{empresa}</span>
                                    {filterEmpresa === empresa && <Check className="ml-auto h-4 w-4 text-orange-500" />}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {(filterEmpleadoId || filterEmpresa) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFilterEmpleadoId(null)
                          setFilterEmpresa("")
                        }}
                        className="h-9 text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Limpiar
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          {calculated && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <Card className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 opacity-80" />
                  <span className="text-xs font-medium opacity-80">Empleados</span>
                </div>
                <p className="text-2xl font-bold">{filteredRows.length}</p>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 opacity-80" />
                  <span className="text-xs font-medium opacity-80">Dias Totales</span>
                </div>
                <p className="text-2xl font-bold">{totals.diasLaborados}</p>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 opacity-80" />
                  <span className="text-xs font-medium opacity-80">Devengado</span>
                </div>
                <p className="text-lg font-bold">L {totals.salarioDevengado.toLocaleString()}</p>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 opacity-80" />
                  <span className="text-xs font-medium opacity-80">Viaticos</span>
                </div>
                <p className="text-lg font-bold">L {totals.viaticos.toLocaleString()}</p>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-red-500 to-red-600 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 opacity-80" />
                  <span className="text-xs font-medium opacity-80">Deducciones</span>
                </div>
                <p className="text-lg font-bold">L {(totals.adelantos + totals.deducciones).toLocaleString()}</p>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 opacity-80" />
                  <span className="text-xs font-medium opacity-80">Neto Total</span>
                </div>
                <p className="text-lg font-bold">L {totals.netoPagar.toLocaleString()}</p>
              </Card>
            </div>
          )}

          {/* Pre-Liquidation Table */}
          {calculated && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="w-5 h-5 text-orange-500" />
                  Pre-Liquidacion del Periodo
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({fechaInicio} al {fechaFin})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Empleado</th>
                        <th className="px-3 py-3 text-center font-medium text-gray-600">Tipo</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-600">Dias</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">Salario</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">Viaticos</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">Adelantos</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">Deducciones</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">Neto</th>
                        <th className="px-3 py-3 text-center font-medium text-gray-600">PDF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredRows.map((row) => (
                        <tr key={row.empleado_id} className={`hover:bg-gray-50 ${row.tipo_pago === "mensual" ? "bg-blue-50/30" : ""}`}>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{row.nombre_completo}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                row.empresa === "FLASHCOM" 
                                  ? "bg-orange-100 text-orange-700" 
                                  : "bg-blue-100 text-blue-700"
                              }`}>
                                {row.empresa}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              row.tipo_pago === "mensual"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {row.tipo_pago === "mensual" ? "Mensual" : "Quinc."}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Input
                              type="number"
                              min="0"
                              max="31"
                              value={row.dias_laborados}
                              onChange={(e) => handleDiasChange(row.empleado_id, parseInt(e.target.value) || 0)}
                              className="w-16 text-center mx-auto text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-green-600 font-medium">
                              L {row.salario_devengado.toLocaleString()}
                            </span>
                            {row.tipo_pago === "mensual" && primeraQuincena && row.dias_laborados === 0 && (
                              <span className="block text-[10px] text-blue-500">Adelanto 1Q</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-cyan-600">
                            L {row.viaticos_transporte.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-red-500">
                            {row.total_adelantos > 0 ? `- L ${row.total_adelantos.toLocaleString()}` : "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-red-500">
                              {row.total_deducciones > 0 ? `- L ${row.total_deducciones.toLocaleString()}` : "-"}
                            </span>
                            {row.adelanto_1q_aplicado && (
                              <span className="block text-[10px] text-orange-500 font-medium">+ L.2000 Adel.1Q</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-bold ${row.neto_pagar >= 0 ? "text-gray-900" : "text-red-600"}`}>
                              L {row.neto_pagar.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generatePDF(row)}
                              className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-bold">
                        <td className="px-4 py-3">TOTALES</td>
                        <td className="px-3 py-3"></td>
                        <td className="px-4 py-3 text-center">{totals.diasLaborados}</td>
                        <td className="px-4 py-3 text-right text-green-600">L {totals.salarioDevengado.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-cyan-600">L {totals.viaticos.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-red-500">- L {totals.adelantos.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-red-500">- L {totals.deducciones.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-900">L {totals.netoPagar.toLocaleString()}</td>
                        <td className="px-3 py-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t">
                  <Button 
                    onClick={handleGuardarNomina} 
                    disabled={saving || filteredRows.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar Nomina del Periodo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {!calculated && !loading && (
            <Card className="p-12">
              <div className="text-center">
                <Calculator className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Seleccione el Periodo</h3>
                <p className="text-sm text-gray-500">
                  Ingrese las fechas de inicio y fin, luego presione &quot;Calcular Nomina&quot; para generar la pre-liquidacion
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Historial */}
        <TabsContent value="historial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="w-5 h-5 text-blue-500" />
                Historial de Nominas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHistorial ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              ) : nominas.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No hay nominas guardadas</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Periodo</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Descripcion</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Estado</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">Total Bruto</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">Total Neto</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Fecha Creacion</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {nominas.map((nomina) => (
                        <tr key={nomina.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {nomina.periodo}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {nomina.descripcion}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              nomina.estado === "pagada" 
                                ? "bg-green-100 text-green-700" 
                                : nomina.estado === "borrador"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-blue-100 text-blue-700"
                            }`}>
                              {nomina.estado}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-green-600 font-medium">
                            L {(nomina.total_bruto || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-gray-900">
                            L {(nomina.total_neto || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {new Date(nomina.created_at).toLocaleDateString("es-HN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleVerDetalle(nomina)}
                                className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver Detalle
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExportExcel(nomina)}
                                disabled={exportingNominaId === nomina.id}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                {exportingNominaId === nomina.id ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <FileSpreadsheet className="w-4 h-4 mr-1" />
                                )}
                                Excel
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setNominaToDelete(nomina)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                aria-label={`Eliminar nomina ${nomina.periodo}`}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Eliminar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetalleDialog} onOpenChange={setShowDetalleDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 pr-8">
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-500" />
                Detalle de Nomina - {selectedNomina?.periodo}
              </DialogTitle>
              {selectedNomina && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportExcel(selectedNomina)}
                  disabled={exportingNominaId === selectedNomina.id}
                  className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                >
                  {exportingNominaId === selectedNomina.id ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 mr-1" />
                  )}
                  Exportar Excel
                </Button>
              )}
            </div>
          </DialogHeader>
          
          {loadingPeriodos ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              {selectedNomina && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Total Bruto</p>
                    <p className="text-lg font-bold text-green-600">L {(selectedNomina.total_bruto || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Deducciones</p>
                    <p className="text-lg font-bold text-red-500">L {(selectedNomina.total_deducciones || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Neto</p>
                    <p className="text-lg font-bold text-gray-900">L {(selectedNomina.total_neto || 0).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Employees Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Empleado</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600">Dias</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600">Salario</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600">Viaticos</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600">Deducciones</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600">Neto</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {periodos.map((periodo) => (
                      <tr key={periodo.id} className="hover:bg-gray-50">
                        <td className="py-2 px-3">
                          <div>
                            <p className="font-medium text-gray-900">{periodo.nombre_completo || `Empleado #${periodo.empleado_id}`}</p>
                            {periodo.empresa && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                periodo.empresa === "FLASHCOM" 
                                  ? "bg-orange-100 text-orange-700" 
                                  : "bg-blue-100 text-blue-700"
                              }`}>
                                {periodo.empresa}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">{periodo.dias_laborados}</td>
                        <td className="py-2 px-3 text-right text-green-600">L {(periodo.salario_devengado || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-cyan-600">L {(periodo.viaticos || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-red-500">- L {(periodo.total_deducciones || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold">L {(periodo.neto_pagado || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => generatePDFFromHistorial(periodo)}
                            className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for deleting a nomina from historial */}
      <AlertDialog
        open={nominaToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deletingNomina) setNominaToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Eliminar nomina
            </AlertDialogTitle>
            <AlertDialogDescription>
              {nominaToDelete ? (
                <>
                  Estas por eliminar permanentemente la nomina{" "}
                  <span className="font-semibold text-gray-900">
                    &quot;{nominaToDelete.periodo}&quot;
                  </span>
                  {nominaToDelete.descripcion ? (
                    <> ({nominaToDelete.descripcion})</>
                  ) : null}
                  . Esta accion tambien eliminara todos los detalles por
                  empleado asociados a esta nomina y no se puede deshacer.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingNomina}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteNomina()
              }}
              disabled={deletingNomina}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              {deletingNomina ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Si, eliminar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
