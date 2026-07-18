"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { exportToExcel } from "@/lib/export-excel"
import {
  Calendar,
  Plus,
  Search,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  CalendarDays,
  Printer,
  Upload,
  FileText,
  ExternalLink,
  History,
  User as UserIcon,
  Scale,
  CalendarCheck,
  Download,
  Pencil,
  Trash2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
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
import {
  calcularAntiguedad,
  calcularProximoAniversario,
  calcularSaldoEmpleado,
  clasificarSaldo,
} from "@/lib/rrhh/vacaciones-utils"

interface Empleado {
  id: number
  nombre_completo: string
  identificacion: string
  cargo: string
  empresa: string
  fecha_ingreso: string | null
  activo: boolean
}

interface Vacacion {
  id: number
  empleado_id: number
  fecha_inicio: string
  fecha_fin: string
  dias_solicitados: number
  motivo: string
  estado: string
  fecha_solicitud: string
  url_documento_firmado?: string | null
}

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "-"
  try {
    const d = new Date(dateStr + (dateStr.length === 10 ? "T00:00:00" : ""))
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("es-HN", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return dateStr
  }
}

export default function VacacionesPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [vacaciones, setVacaciones] = useState<Vacacion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchSaldos, setSearchSaldos] = useState("")
  const [searchSolicitudes, setSearchSolicitudes] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const { toast } = useToast()

  // Dialogs
  const [showSolicitudDialog, setShowSolicitudDialog] = useState(false)
  const [showHistorialDialog, setShowHistorialDialog] = useState(false)
  const [historialEmpleadoId, setHistorialEmpleadoId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [openCombobox, setOpenCombobox] = useState(false)
  // When set, the solicitud dialog is editing this existing record instead of
  // creating a new one.
  const [editingId, setEditingId] = useState<number | null>(null)
  // Vacacion pending delete confirmation.
  const [deletingVac, setDeletingVac] = useState<Vacacion | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [form, setForm] = useState({
    empleado_id: 0,
    fecha_inicio: "",
    fecha_fin: "",
    motivo: "",
  })

  // Upload document state
  const [uploadingId, setUploadingId] = useState<number | null>(null)

  // Historical accrual balances coming from the DB view vw_control_vacaciones,
  // keyed by empleado_id. This replaces the old single-year local calculation.
  const [controlSaldos, setControlSaldos] = useState<
    Record<
      number,
      {
        nombre_completo: string | null
        anos_antiguedad: number | null
        fecha_ingreso: string | null
        dias_acumulados_ley: number
        dias_tomados: number
        dias_pendientes: number
      }
    >
  >({})

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [empRes, vacRes, controlRes] = await Promise.all([
        fetch("/api/rrhh/empleados?activo=true"),
        fetch("/api/rrhh/vacaciones"),
        fetch("/api/rrhh/vacaciones/control"),
      ])
      const empData = await empRes.json()
      const vacData = await vacRes.json()
      const controlData = await controlRes.json()
      if (empData.success) setEmpleados(empData.data || [])
      if (vacData.success) setVacaciones(vacData.data || [])
      if (controlData.success) {
        const map: Record<number, any> = {}
        for (const row of controlData.data || []) {
          map[row.empleado_id] = row
        }
        setControlSaldos(map)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Counts the vacation days between the two dates (inclusive), EXCLUDING
  // Sundays, which are the only non-working (rest) day. Dates are parsed as
  // local calendar dates so the weekday is not shifted by the UTC offset.
  const calcularDias = (inicio: string, fin: string) => {
    if (!inicio || !fin) return 0
    const [ys, ms, ds] = inicio.split("T")[0].split("-").map(Number)
    const [ye, me, de] = fin.split("T")[0].split("-").map(Number)
    const start = new Date(ys, ms - 1, ds)
    const end = new Date(ye, me - 1, de)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0
    let count = 0
    const cur = new Date(start)
    while (cur <= end) {
      if (cur.getDay() !== 0) count++ // 0 = domingo (día no hábil, excluido)
      cur.setDate(cur.getDate() + 1)
    }
    return count
  }

  // Pre-compute balances for each employee. Balances now come from the
  // vw_control_vacaciones view (historical accrual across all years):
  //   - diasAcumulados <- dias_acumulados_ley
  //   - diasTomados    <- dias_tomados (approved requests)
  //   - diasPendientes <- dias_acumulados_ley - dias_tomados
  // The local calcularSaldoEmpleado is kept only as a fallback for employees
  // that have no row in the view yet (e.g. brand-new hires).
  const saldosPorEmpleado = useMemo(() => {
    const map: Record<number, ReturnType<typeof calcularSaldoEmpleado>> = {}
    for (const emp of empleados) {
      const control = controlSaldos[emp.id]
      if (control) {
        map[emp.id] = {
          diasAcumulados: control.dias_acumulados_ley,
          diasTomados: control.dias_tomados,
          diasPendientes: control.dias_pendientes,
        } as ReturnType<typeof calcularSaldoEmpleado>
      } else {
        const vacsDelEmpleado = vacaciones.filter((v) => v.empleado_id === emp.id)
        map[emp.id] = calcularSaldoEmpleado(emp.fecha_ingreso, vacsDelEmpleado)
      }
    }
    return map
  }, [empleados, vacaciones, controlSaldos])

  const selectedEmpleado = empleados.find((e) => e.id === form.empleado_id)
  const saldoSeleccionado = selectedEmpleado ? saldosPorEmpleado[selectedEmpleado.id] : null
  const diasForm = calcularDias(form.fecha_inicio, form.fecha_fin)
  // When editing an existing record, its days are already reflected in
  // diasPendientes (especially if it was "aprobada"), so they must be added
  // back to get the true balance available for this edit. Otherwise we would
  // double-count the request against itself and wrongly block the edit.
  const vacEnEdicion = editingId !== null ? vacaciones.find((v) => v.id === editingId) : null
  const diasReintegrados =
    vacEnEdicion && vacEnEdicion.estado === "aprobada" ? Number(vacEnEdicion.dias_solicitados ?? 0) : 0
  const disponiblesParaEdicion = saldoSeleccionado
    ? saldoSeleccionado.diasPendientes + diasReintegrados
    : 0
  const excedeDisponibles = saldoSeleccionado ? diasForm > disponiblesParaEdicion : false

  // Print a filled request for a specific solicitud (existing behaviour)
  const imprimirSolicitud = (vac: Vacacion) => {
    const empleado = empleados.find((e) => e.id === vac.empleado_id)
    imprimirDocumento(empleado, {
      fecha_inicio: vac.fecha_inicio,
      fecha_fin: vac.fecha_fin,
      dias_solicitados: vac.dias_solicitados,
      motivo: vac.motivo,
      fecha_solicitud: vac.fecha_solicitud,
    })
  }

  // Generate a blank/printable document for an empleado from the saldos table.
  // Spaces are reserved for the user to fill dates manually if needed.
  const imprimirDocumentoEmpleado = (empleado: Empleado) => {
    imprimirDocumento(empleado, null)
  }

  const imprimirDocumento = (
    empleado: Empleado | undefined,
    solicitud: {
      fecha_inicio: string
      fecha_fin: string
      dias_solicitados: number
      motivo?: string
      fecha_solicitud?: string
    } | null,
  ) => {
    if (!empleado) return
    const saldo = saldosPorEmpleado[empleado.id] || {
      diasAcumulados: 0,
      diasTomados: 0,
      diasPendientes: 0,
      aniosCompletos: 0,
    }
    const antiguedad = calcularAntiguedad(empleado.fecha_ingreso)

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const rangoHTML = solicitud
      ? `
        <div class="row"><span>Fecha de Solicitud:</span><span><strong>${formatDate(solicitud.fecha_solicitud || new Date().toISOString().split("T")[0])}</strong></span></div>
        <div class="row"><span>Fecha Inicio:</span><span><strong>${formatDate(solicitud.fecha_inicio)}</strong></span></div>
        <div class="row"><span>Fecha Fin:</span><span><strong>${formatDate(solicitud.fecha_fin)}</strong></span></div>
        <div class="row"><span>Total Dias Solicitados:</span><span><strong>${solicitud.dias_solicitados} dias</strong></span></div>
        ${solicitud.motivo ? `<div class="field"><span class="field-label">Motivo:</span><span class="field-value">${solicitud.motivo}</span></div>` : ""}
      `
      : `
        <div class="row"><span>Fecha de Solicitud:</span><span class="fill-line">__________________</span></div>
        <div class="row"><span>Fecha Inicio:</span><span class="fill-line">__________________</span></div>
        <div class="row"><span>Fecha Fin:</span><span class="fill-line">__________________</span></div>
        <div class="row"><span>Total Dias Solicitados:</span><span class="fill-line">____ dias</span></div>
        <div class="field" style="margin-top:10px;"><span class="field-label">Motivo:</span><span class="fill-line-full">_______________________________________________</span></div>
      `

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Solicitud de Vacaciones - ${empleado.nombre_completo}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 760px; margin: 0 auto; color: #1f2937; }
          .header { text-align: center; border-bottom: 3px solid #111827; padding-bottom: 16px; margin-bottom: 28px; }
          .header h1 { font-size: 22px; margin: 0; letter-spacing: 1px; }
          .header p { color: #6b7280; margin: 6px 0 0; font-size: 13px; }
          .section { margin-bottom: 22px; }
          .section-title { font-weight: bold; font-size: 13px; color: #111827; margin-bottom: 10px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
          .field { display: flex; font-size: 13px; }
          .field-label { font-weight: 600; width: 150px; color: #374151; }
          .field-value { flex: 1; color: #111827; }
          .balance-box { background: #f3f4f6; padding: 14px 18px; border-radius: 6px; margin-top: 10px; border-left: 4px solid #f97316; }
          .balance-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
          .balance-row strong { color: #111827; }
          .dates-box { background: #fff7ed; padding: 16px; border-radius: 6px; margin: 12px 0; border: 1px solid #fed7aa; }
          .dates-box .row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
          .fill-line { border-bottom: 1px solid #111827; display: inline-block; min-width: 180px; text-align: center; }
          .fill-line-full { border-bottom: 1px solid #111827; display: inline-block; min-width: 100%; }
          .signature-area { margin-top: 70px; }
          .signature-container { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 40px; }
          .signature-line { border-top: 1px solid #111827; padding-top: 8px; text-align: center; font-size: 12px; color: #374151; font-weight: 600; }
          .footer-note { margin-top: 30px; font-size: 11px; color: #6b7280; text-align: center; border-top: 1px dashed #d1d5db; padding-top: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SOLICITUD DE VACACIONES</h1>
          <p>Formulario oficial conforme al Codigo de Trabajo de Honduras</p>
        </div>

        <div class="section">
          <div class="section-title">Datos del Empleado</div>
          <div class="grid">
            <div class="field"><span class="field-label">Nombre:</span><span class="field-value">${empleado.nombre_completo || "-"}</span></div>
            <div class="field"><span class="field-label">Identificacion:</span><span class="field-value">${empleado.identificacion || "-"}</span></div>
            <div class="field"><span class="field-label">Cargo:</span><span class="field-value">${empleado.cargo || "-"}</span></div>
            <div class="field"><span class="field-label">Empresa:</span><span class="field-value">${empleado.empresa || "-"}</span></div>
            <div class="field"><span class="field-label">Fecha Ingreso:</span><span class="field-value">${formatDate(empleado.fecha_ingreso)}</span></div>
            <div class="field"><span class="field-label">Antiguedad:</span><span class="field-value">${antiguedad.texto}</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Balance de Vacaciones</div>
          <div class="balance-box">
            <div class="balance-row"><span>Dias Acumulados (Ley):</span><strong>${saldo.diasAcumulados} dias</strong></div>
            <div class="balance-row"><span>Dias Tomados:</span><strong>${saldo.diasTomados} dias</strong></div>
            <div class="balance-row"><span>Dias Pendientes:</span><strong style="color: ${saldo.diasPendientes >= 15 ? "#dc2626" : saldo.diasPendientes >= 5 ? "#d97706" : "#16a34a"};">${saldo.diasPendientes} dias</strong></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Detalles de la Solicitud</div>
          <div class="dates-box">
            ${rangoHTML}
          </div>
        </div>

        <div class="signature-area">
          <div class="section-title">Firmas de Autorizacion</div>
          <div class="signature-container">
            <div class="signature-line">Firma del Empleado</div>
            <div class="signature-line">Firma del Jefe Inmediato</div>
            <div class="signature-line">Firma de Recursos Humanos</div>
          </div>
        </div>

        <div class="footer-note">
          Este documento debe ser firmado por las tres partes y entregado a Recursos Humanos para su archivo.
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 300)
  }

  // Upload signed document for a specific vacacion record
  const handleUploadDocumento = async (vacacionId: number, file: File) => {
    setUploadingId(vacacionId)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("vacacion_id", String(vacacionId))

      const uploadRes = await fetch("/api/rrhh/vacaciones/upload", { method: "POST", body: formData })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || "Error al subir el archivo")
      }

      const updateRes = await fetch(`/api/rrhh/vacaciones/${vacacionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url_documento_firmado: uploadData.url }),
      })
      const updateData = await updateRes.json()
      if (!updateData.success) throw new Error(updateData.error)

      toast({ title: "Documento subido", description: "El documento firmado se guardo correctamente" })
      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo subir el documento",
        variant: "destructive",
      })
    } finally {
      setUploadingId(null)
    }
  }

  const handleSolicitud = async () => {
    if (!form.empleado_id || !form.fecha_inicio || !form.fecha_fin) {
      toast({
        title: "Datos incompletos",
        description: "Complete empleado, fecha inicio y fecha fin",
        variant: "destructive",
      })
      return
    }
    if (new Date(form.fecha_fin) < new Date(form.fecha_inicio)) {
      toast({
        title: "Rango invalido",
        description: "La fecha fin no puede ser menor a la fecha inicio",
        variant: "destructive",
      })
      return
    }
    if (excedeDisponibles) {
      toast({
        title: "Saldo insuficiente",
        description: "El empleado no cuenta con suficientes días acumulados",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const isEdit = editingId !== null
      const res = await fetch(
        isEdit ? `/api/rrhh/vacaciones/${editingId}` : "/api/rrhh/vacaciones",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            dias_solicitados: diasForm,
          }),
        },
      )
      const data = await res.json()

      if (data.success) {
        toast({
          title: "Exito",
          description: isEdit
            ? "Asignacion de vacaciones actualizada"
            : "Solicitud de vacaciones registrada",
        })
        setShowSolicitudDialog(false)
        setEditingId(null)
        setForm({ empleado_id: 0, fecha_inicio: "", fecha_fin: "", motivo: "" })
        loadData()
      } else {
        throw new Error(data.error || "No se pudo guardar la solicitud")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar la solicitud",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Opens the dialog in edit mode pre-filled with the selected vacacion.
  const openEditDialog = (vac: Vacacion) => {
    setEditingId(vac.id)
    setForm({
      empleado_id: vac.empleado_id,
      fecha_inicio: vac.fecha_inicio ? vac.fecha_inicio.split("T")[0] : "",
      fecha_fin: vac.fecha_fin ? vac.fecha_fin.split("T")[0] : "",
      motivo: vac.motivo || "",
    })
    setShowSolicitudDialog(true)
  }

  const handleDelete = async () => {
    if (!deletingVac) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/rrhh/vacaciones/${deletingVac.id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Eliminada", description: "Asignacion de vacaciones eliminada" })
        setDeletingVac(null)
        loadData()
      } else {
        throw new Error(data.error || "No se pudo eliminar la asignacion")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar la asignacion",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const actualizarEstado = async (vacacionId: number, estado: string) => {
    try {
      const res = await fetch(`/api/rrhh/vacaciones/${vacacionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      })
      const data = await res.json()
      if (data.success) {
        toast({
          title: "Exito",
          description: estado === "aprobada" ? "Vacaciones aprobadas" : "Vacaciones rechazadas",
        })
        loadData()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      })
    }
  }

  const openSolicitudForEmpleado = (empleadoId: number) => {
    setEditingId(null)
    setForm({ empleado_id: empleadoId, fecha_inicio: "", fecha_fin: "", motivo: "" })
    setShowSolicitudDialog(true)
  }

  const openHistorialForEmpleado = (empleadoId: number) => {
    setHistorialEmpleadoId(empleadoId)
    setShowHistorialDialog(true)
  }

  const stats = {
    pendientes: vacaciones.filter((v) => v.estado === "pendiente").length,
    aprobadas: vacaciones.filter((v) => v.estado === "aprobada").length,
    rechazadas: vacaciones.filter((v) => v.estado === "rechazada").length,
    activas: vacaciones.filter((v) => {
      const today = new Date().toISOString().split("T")[0]
      return v.estado === "aprobada" && v.fecha_inicio <= today && v.fecha_fin >= today
    }).length,
  }

  const filteredEmpleados = empleados.filter((e) =>
    e.nombre_completo?.toLowerCase().includes(searchSaldos.toLowerCase()) ||
    e.identificacion?.toLowerCase().includes(searchSaldos.toLowerCase())
  )

  const filteredVacaciones = vacaciones.filter((vac) => {
    const empleado = empleados.find((e) => e.id === vac.empleado_id)
    const matchSearch = empleado?.nombre_completo
      ?.toLowerCase()
      .includes(searchSolicitudes.toLowerCase())
    const matchEstado = filterEstado === "todos" || vac.estado === filterEstado
    return matchSearch && matchEstado
  })

  // Export currently-filtered vacaciones as a CSV file (opens natively in Excel)
  const exportVacacionesExcel = () => {
    if (!filteredVacaciones || filteredVacaciones.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay solicitudes para exportar",
        variant: "destructive",
      })
      return
    }

    const headers = [
      "ID",
      "Empleado",
      "Identificacion",
      "Empresa",
      "Fecha Solicitud",
      "Fecha Inicio",
      "Fecha Fin",
      "Dias",
      "Estado",
      "Motivo",
      "Documento Firmado",
    ]

    const rows = filteredVacaciones.map((v) => {
      const emp = empleados.find((e) => e.id === v.empleado_id)
      return [
        v.id,
        emp?.nombre_completo || "-",
        emp?.identificacion || "-",
        emp?.empresa || "-",
        v.fecha_solicitud || "",
        v.fecha_inicio || "",
        v.fecha_fin || "",
        v.dias_solicitados || 0,
        v.estado || "",
        v.motivo || "",
        v.url_documento_firmado ? "Si" : "No",
      ]
    })

    const today = new Date().toISOString().slice(0, 10)
    exportToExcel({ filename: `vacaciones_${today}`, sheetName: "Vacaciones", headers, rows })

    toast({
      title: "Exportado",
      description: `Se exportaron ${filteredVacaciones.length} solicitudes`,
    })
  }

  const historialEmpleado = historialEmpleadoId
    ? empleados.find((e) => e.id === historialEmpleadoId)
    : null
  const historialVacaciones = historialEmpleadoId
    ? vacaciones
        .filter((v) => v.empleado_id === historialEmpleadoId)
        .sort((a, b) => (b.fecha_inicio > a.fecha_inicio ? 1 : -1))
    : []
  const saldoHistorial = historialEmpleadoId ? saldosPorEmpleado[historialEmpleadoId] : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vacaciones y Permisos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Control de saldos y solicitudes conforme al Codigo de Trabajo de Honduras
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={exportVacacionesExcel}
            disabled={vacaciones.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
          <Button
            onClick={() => {
              setEditingId(null)
              setForm({ empleado_id: 0, fecha_inicio: "", fecha_fin: "", motivo: "" })
              setShowSolicitudDialog(true)
            }}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Solicitud
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pendientes" value={stats.pendientes} Icon={Clock} color="amber" />
        <StatCard label="Aprobadas" value={stats.aprobadas} Icon={CheckCircle} color="green" />
        <StatCard label="Rechazadas" value={stats.rechazadas} Icon={XCircle} color="red" />
        <StatCard label="Activas Hoy" value={stats.activas} Icon={CalendarDays} color="blue" />
      </div>

      {/* Control de Saldos */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Scale className="w-4 h-4 text-orange-500" />
              Control de Saldos de Vacaciones
            </CardTitle>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar empleado..."
                value={searchSaldos}
                onChange={(e) => setSearchSaldos(e.target.value)}
                className="pl-9 h-9 w-full sm:w-72"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : filteredEmpleados.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No hay empleados activos</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-600 uppercase tracking-wide">
                    <th className="text-left font-semibold px-2 py-3">Empleado</th>
                    <th className="text-left font-semibold px-2 py-3">Fecha Ingreso</th>
                    <th className="text-left font-semibold px-2 py-3">Antiguedad</th>
                    <th className="text-left font-semibold px-2 py-3">Prox. Aniversario</th>
                    <th className="text-center font-semibold px-2 py-3">Acumulados</th>
                    <th className="text-center font-semibold px-2 py-3">Tomados</th>
                    <th className="text-center font-semibold px-2 py-3">Pendientes</th>
                    <th className="text-center font-semibold px-2 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmpleados.map((emp) => {
                    const saldo = saldosPorEmpleado[emp.id] || {
                      diasAcumulados: 0,
                      diasTomados: 0,
                      diasPendientes: 0,
                      aniosCompletos: 0,
                    }
                    const control = controlSaldos[emp.id]
                    const antig = calcularAntiguedad(emp.fecha_ingreso)
                    // Prefer the antiquity computed by the DB view (anos_antiguedad),
                    // shown as "${anos_antiguedad} años"; fall back to the local
                    // "años y meses" text for employees not yet in the view.
                    const antiguedadTexto =
                      control?.anos_antiguedad != null
                        ? `${control.anos_antiguedad} años`
                        : antig.texto
                    const proxAniv = calcularProximoAniversario(emp.fecha_ingreso)
                    const clasif = clasificarSaldo(saldo.diasPendientes)
                    // No available balance: 0 or negative pending days. Used to
                    // highlight the cell and block new requests for this employee.
                    const sinSaldo = saldo.diasPendientes <= 0

                    return (
                      <tr
                        key={emp.id}
                        className="border-b border-gray-100 hover:bg-orange-50/40 transition-colors"
                      >
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-semibold">
                              {emp.nombre_completo?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{emp.nombre_completo}</p>
                              <p className="text-xs text-gray-500">{emp.cargo || emp.empresa}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-gray-700 whitespace-nowrap">
                          {formatDate(emp.fecha_ingreso)}
                        </td>
                        <td className="px-2 py-3 text-gray-700 whitespace-nowrap">{antiguedadTexto}</td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-gray-700">
                            <CalendarCheck className="w-3.5 h-3.5 text-gray-400" />
                            {formatDate(proxAniv)}
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <span className="inline-flex items-center justify-center min-w-[40px] px-2 py-1 rounded-md bg-gray-100 text-gray-800 text-xs font-semibold">
                            {saldo.diasAcumulados}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <span className="inline-flex items-center justify-center min-w-[40px] px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">
                            {saldo.diasTomados}
                          </span>
                        </td>
                        <td className={`px-2 py-3 text-center ${sinSaldo ? "bg-red-50" : ""}`}>
                          <span
                            className={`inline-flex items-center gap-1 min-w-[50px] justify-center px-2 py-1 rounded-md text-xs font-semibold ${
                              sinSaldo
                                ? "bg-red-100 text-red-700 ring-1 ring-red-300"
                                : clasif === "high"
                                ? "bg-red-100 text-red-700 ring-1 ring-red-300"
                                : clasif === "medium"
                                ? "bg-amber-100 text-amber-700"
                                : clasif === "low"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {(sinSaldo || clasif === "high") && <AlertTriangle className="w-3 h-3" />}
                            {saldo.diasPendientes}
                          </span>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => imprimirDocumentoEmpleado(emp)}
                              className="h-7 text-[11px] px-2"
                              title="Generar solicitud imprimible"
                            >
                              <Printer className="w-3 h-3 mr-1" />
                              Imprimir
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openSolicitudForEmpleado(emp.id)}
                              disabled={saldo.diasAcumulados === 0 || sinSaldo}
                              className="h-7 text-[11px] px-2 bg-orange-500 hover:bg-orange-600"
                              title={
                                saldo.diasAcumulados === 0
                                  ? "Aun no tiene derecho (< 1 ano)"
                                  : sinSaldo
                                  ? "Sin dias disponibles actuales"
                                  : "Registrar nueva solicitud"
                              }
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Solicitar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openHistorialForEmpleado(emp.id)}
                              className="h-7 text-[11px] px-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              <History className="w-3 h-3 mr-1" />
                              Historial
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gestión de Solicitudes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              Gestion de Solicitudes
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por empleado..."
                  value={searchSolicitudes}
                  onChange={(e) => setSearchSolicitudes(e.target.value)}
                  className="pl-9 h-9 w-full sm:w-60"
                />
              </div>
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-md text-sm h-9 bg-white"
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="aprobada">Aprobadas</option>
                <option value="rechazada">Rechazadas</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : filteredVacaciones.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No hay solicitudes de vacaciones</p>
          ) : (
            <div className="space-y-3">
              {filteredVacaciones.map((vac) => {
                const empleado = empleados.find((e) => e.id === vac.empleado_id)
                return (
                  <div
                    key={vac.id}
                    className={`p-4 rounded-lg border ${
                      vac.estado === "pendiente"
                        ? "border-amber-200 bg-amber-50"
                        : vac.estado === "aprobada"
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            vac.estado === "pendiente"
                              ? "bg-amber-100"
                              : vac.estado === "aprobada"
                              ? "bg-green-100"
                              : "bg-red-100"
                          }`}
                        >
                          {vac.estado === "pendiente" && <Clock className="w-5 h-5 text-amber-600" />}
                          {vac.estado === "aprobada" && <CheckCircle className="w-5 h-5 text-green-600" />}
                          {vac.estado === "rechazada" && <XCircle className="w-5 h-5 text-red-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {empleado?.nombre_completo || "Empleado"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {empleado?.cargo} {empleado?.empresa ? `- ${empleado.empresa}` : ""}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-sm text-gray-700">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {formatDate(vac.fecha_inicio)} - {formatDate(vac.fecha_fin)}
                            </span>
                            <span className="text-gray-400">|</span>
                            <span className="font-medium">{vac.dias_solicitados} dias</span>
                          </div>
                          {vac.motivo && (
                            <p className="text-xs text-gray-500 mt-1">Motivo: {vac.motivo}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            vac.estado === "pendiente"
                              ? "bg-amber-200 text-amber-800"
                              : vac.estado === "aprobada"
                              ? "bg-green-200 text-green-800"
                              : "bg-red-200 text-red-800"
                          }`}
                        >
                          {vac.estado === "pendiente"
                            ? "Pendiente"
                            : vac.estado === "aprobada"
                            ? "Aprobada"
                            : "Rechazada"}
                        </span>

                        <div className="flex flex-wrap gap-1 justify-end">
                          {vac.estado === "pendiente" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => actualizarEstado(vac.id, "aprobada")}
                                className="bg-green-500 hover:bg-green-600 h-7"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => actualizarEstado(vac.id, "rechazada")}
                                className="h-7"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => imprimirSolicitud(vac)}
                            className="h-7 text-xs"
                          >
                            <Printer className="w-3 h-3 mr-1" />
                            Imprimir
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(vac)}
                            className="h-7 text-xs"
                            title="Editar asignacion"
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Editar
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeletingVac(vac)}
                            className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            title="Eliminar asignacion"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Eliminar
                          </Button>

                          {vac.url_documento_firmado ? (
                            <a
                              href={vac.url_documento_firmado}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md transition-colors"
                            >
                              <FileText className="w-3 h-3" />
                              Ver Documento
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <label className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md cursor-pointer transition-colors">
                              {uploadingId === vac.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Upload className="w-3 h-3" />
                              )}
                              Subir Firmado
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="hidden"
                                disabled={uploadingId === vac.id}
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handleUploadDocumento(vac.id, file)
                                  e.target.value = ""
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New / Edit Request Dialog */}
      <Dialog
        open={showSolicitudDialog}
        onOpenChange={(open) => {
          setShowSolicitudDialog(open)
          if (!open) {
            setEditingId(null)
            setForm({ empleado_id: 0, fecha_inicio: "", fecha_fin: "", motivo: "" })
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? "Editar Asignacion de Vacaciones" : "Nueva Solicitud de Vacaciones"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Los dias solicitados no pueden exceder el saldo pendiente segun la Ley de Honduras.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Empleado *</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between h-auto py-2"
                  >
                    {form.empleado_id ? (
                      <div className="flex flex-col items-start">
                        <span className="font-medium">
                          {empleados.find((e) => e.id === form.empleado_id)?.nombre_completo}
                        </span>
                        <span className="text-xs text-gray-500">
                          {empleados.find((e) => e.id === form.empleado_id)?.identificacion} -{" "}
                          {empleados.find((e) => e.id === form.empleado_id)?.empresa}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500">Buscar empleado...</span>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por nombre o identificacion..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron empleados.</CommandEmpty>
                      <CommandGroup>
                        {empleados.map((emp) => (
                          <CommandItem
                            key={emp.id}
                            value={`${emp.nombre_completo} ${emp.identificacion}`}
                            onSelect={() => {
                              setForm({ ...form, empleado_id: emp.id })
                              setOpenCombobox(false)
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{emp.nombre_completo}</span>
                              <span className="text-xs text-gray-500">
                                {emp.identificacion} - {emp.empresa}
                              </span>
                            </div>
                            {form.empleado_id === emp.id && (
                              <CheckCircle className="ml-auto h-4 w-4 text-green-500" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {form.empleado_id > 0 && saldoSeleccionado && (
                <div
                  className={`p-3 rounded-lg border-2 ${
                    saldoSeleccionado.diasPendientes > 0
                      ? "bg-green-50 border-green-200"
                      : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <CalendarDays
                        className={`w-5 h-5 ${
                          saldoSeleccionado.diasPendientes > 0 ? "text-green-600" : "text-amber-600"
                        }`}
                      />
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            saldoSeleccionado.diasPendientes > 0 ? "text-green-700" : "text-amber-700"
                          }`}
                        >
                          Dias Pendientes: {saldoSeleccionado.diasPendientes}
                        </p>
                        <p className="text-xs text-gray-600">
                          Acumulados: {saldoSeleccionado.diasAcumulados} - Tomados:{" "}
                          {saldoSeleccionado.diasTomados}
                        </p>
                      </div>
                    </div>
                    {saldoSeleccionado.diasAcumulados === 0 && (
                      <span className="text-[11px] text-amber-700 font-medium">
                        Aun no ha cumplido 1 ano
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha Inicio *</Label>
                <Input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                />
              </div>
              <div>
                <Label>Fecha Fin *</Label>
                <Input
                  type="date"
                  value={form.fecha_fin}
                  onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                />
              </div>
            </div>
            {form.fecha_inicio && form.fecha_fin && (
              <div
                className={`p-2 rounded-lg text-sm text-center font-medium ${
                  excedeDisponibles
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {excedeDisponibles ? (
                  <span className="flex items-center justify-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    El empleado no cuenta con suficientes días acumulados
                  </span>
                ) : (
                  <>Total: {diasForm} dias (no incluye domingos)</>
                )}
              </div>
            )}
            <div>
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                placeholder="Describa el motivo de la solicitud..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSolicitudDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSolicitud}
              disabled={submitting || excedeDisponibles}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingId !== null ? "Guardar Cambios" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deletingVac !== null} onOpenChange={(open) => !open && setDeletingVac(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Eliminar Asignacion
            </DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. La asignacion sera eliminada permanentemente y los
              dias volveran a estar disponibles para el empleado.
            </DialogDescription>
          </DialogHeader>

          {deletingVac && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm space-y-1">
              <p className="font-medium text-gray-900">
                {empleados.find((e) => e.id === deletingVac.empleado_id)?.nombre_completo ||
                  "Empleado"}
              </p>
              <p className="text-gray-600">
                {deletingVac.fecha_inicio?.split("T")[0]} al {deletingVac.fecha_fin?.split("T")[0]}
              </p>
              <p className="text-gray-600">{deletingVac.dias_solicitados} dias - {deletingVac.estado}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingVac(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Historial por Empleado Dialog */}
      <Dialog
        open={showHistorialDialog}
        onOpenChange={(open) => {
          setShowHistorialDialog(open)
          if (!open) setHistorialEmpleadoId(null)
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              Historial de Vacaciones
            </DialogTitle>
            <DialogDescription>
              {historialEmpleado ? (
                <span className="flex items-center gap-2 text-gray-700">
                  <UserIcon className="w-4 h-4" />
                  {historialEmpleado.nombre_completo}
                  {historialEmpleado.identificacion && (
                    <span className="text-gray-400">- {historialEmpleado.identificacion}</span>
                  )}
                </span>
              ) : (
                "Empleado"
              )}
            </DialogDescription>
          </DialogHeader>

          {saldoHistorial && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
                <p className="text-[11px] text-gray-500 uppercase font-medium">Acumulados</p>
                <p className="text-lg font-bold text-gray-900">{saldoHistorial.diasAcumulados}</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
                <p className="text-[11px] text-blue-600 uppercase font-medium">Tomados</p>
                <p className="text-lg font-bold text-blue-700">{saldoHistorial.diasTomados}</p>
              </div>
              <div
                className={`rounded-lg border p-3 text-center ${
                  clasificarSaldo(saldoHistorial.diasPendientes) === "high"
                    ? "bg-red-50 border-red-200"
                    : clasificarSaldo(saldoHistorial.diasPendientes) === "medium"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-green-50 border-green-200"
                }`}
              >
                <p
                  className={`text-[11px] uppercase font-medium ${
                    clasificarSaldo(saldoHistorial.diasPendientes) === "high"
                      ? "text-red-600"
                      : clasificarSaldo(saldoHistorial.diasPendientes) === "medium"
                      ? "text-amber-600"
                      : "text-green-600"
                  }`}
                >
                  Pendientes
                </p>
                <p
                  className={`text-lg font-bold ${
                    clasificarSaldo(saldoHistorial.diasPendientes) === "high"
                      ? "text-red-700"
                      : clasificarSaldo(saldoHistorial.diasPendientes) === "medium"
                      ? "text-amber-700"
                      : "text-green-700"
                  }`}
                >
                  {saldoHistorial.diasPendientes}
                </p>
              </div>
            </div>
          )}

          <div className="max-h-[50vh] overflow-y-auto">
            {historialVacaciones.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">
                No hay vacaciones registradas para este empleado
              </p>
            ) : (
              <div className="space-y-2">
                {historialVacaciones.map((v) => (
                  <div
                    key={v.id}
                    className={`p-3 rounded-lg border text-sm flex items-center justify-between flex-wrap gap-2 ${
                      v.estado === "aprobada"
                        ? "border-green-200 bg-green-50"
                        : v.estado === "rechazada"
                        ? "border-red-200 bg-red-50"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {v.estado === "aprobada" && <CheckCircle className="w-4 h-4 text-green-600" />}
                      {v.estado === "rechazada" && <XCircle className="w-4 h-4 text-red-600" />}
                      {v.estado === "pendiente" && <Clock className="w-4 h-4 text-amber-600" />}
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatDate(v.fecha_inicio)} - {formatDate(v.fecha_fin)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {v.dias_solicitados} dias - Solicitada: {formatDate(v.fecha_solicitud)}
                          {v.motivo && ` - ${v.motivo}`}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                        v.estado === "aprobada"
                          ? "bg-green-200 text-green-800"
                          : v.estado === "rechazada"
                          ? "bg-red-200 text-red-800"
                          : "bg-amber-200 text-amber-800"
                      }`}
                    >
                      {v.estado.charAt(0).toUpperCase() + v.estado.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistorialDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* Small reusable stat card component */
function StatCard({
  label,
  value,
  Icon,
  color,
}: {
  label: string
  value: number
  Icon: any
  color: "amber" | "green" | "red" | "blue"
}) {
  const colorMap = {
    amber: { ring: "text-amber-600", bg: "bg-amber-100", iconColor: "text-amber-600" },
    green: { ring: "text-green-600", bg: "bg-green-100", iconColor: "text-green-600" },
    red: { ring: "text-red-600", bg: "bg-red-100", iconColor: "text-red-600" },
    blue: { ring: "text-blue-600", bg: "bg-blue-100", iconColor: "text-blue-600" },
  }[color]
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${colorMap.ring}`}>{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-full ${colorMap.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${colorMap.iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
