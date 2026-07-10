"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Users,
  DollarSign,
  Calendar,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  Upload,
  FileText,
  PartyPopper,
  Loader2,
  Wallet,
} from "lucide-react"

interface Acuerdo {
  id: number
  empleado_id: number | null
  // Real column in DB is `urlacuerdo` (no underscore). The GET API returns it
  // via `select *`, so the field name here must match the schema exactly.
  urlacuerdo: string | null
  monto_total: number
  // Real column is `numero_cuotas`; the GET API also exposes `cantidad_cuotas`
  // as a compatibility alias.
  numero_cuotas: number
  cantidad_cuotas?: number
  monto_por_cuota: number
  // Real column in DB is `fecha_acuerdo`.
  fecha_acuerdo: string
  estado: string
  created_at: string
  // The manual ex-employee data is persisted in the empleados table and
  // returned here via the FK join in the GET endpoint.
  empleados: {
    nombre_completo: string
    identificacion: string
    empresa: string
  } | null
  cuotas_pagadas: number
  cuotas_totales: number
  saldo_pendiente: number
}

interface Pago {
  id: number
  acuerdo_id: number
  numero_cuota: number
  // Column name in DB is `monto_cuota` per the canonical schema.
  monto_cuota: number
  fecha_programada: string
  fecha_pago: string | null
  estado: "Pendiente" | "Pagado"
  url_comprobante: string | null
}

const emptyForm = {
  nombre_ex_empleado: "",
  identificacion_ex_empleado: "",
  monto_total: "",
  numero_cuotas: "6",
  fecha_acuerdo: new Date().toISOString().slice(0, 10),
}

// Helper: pick the displayable name/cedula from the joined empleados record.
// The manual ex-employee data captured at registration is upserted into the
// empleados table, so this single source covers both legacy and new acuerdos.
function getExEmpleadoDisplay(a: Acuerdo): { nombre: string; cedula: string } {
  return {
    nombre: a.empleados?.nombre_completo || "-",
    cedula: a.empleados?.identificacion || "",
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-"
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleDateString("es-HN", { day: "2-digit", month: "short", year: "numeric" })
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    minimumFractionDigits: 2,
  }).format(Number(value || 0))
}

export default function PrestacionesPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"registrar" | "control">("control")
  const [acuerdos, setAcuerdos] = useState<Acuerdo[]>([])
  const [loadingAcuerdos, setLoadingAcuerdos] = useState(true)
  const [showFinalizados, setShowFinalizados] = useState(false)

  // Form state (Tab 1)
  const [form, setForm] = useState(emptyForm)
  const [acuerdoFile, setAcuerdoFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Payment plan modal state (Tab 2)
  const [planAcuerdo, setPlanAcuerdo] = useState<Acuerdo | null>(null)
  const [planPagos, setPlanPagos] = useState<Pago[]>([])
  const [loadingPlan, setLoadingPlan] = useState(false)

  // Individual payment dialog state
  const [payingPago, setPayingPago] = useState<Pago | null>(null)
  const [payFile, setPayFile] = useState<File | null>(null)

  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10))
  const [uploadingPay, setUploadingPay] = useState(false)

  // ---- Data loaders -------------------------------------------------------

  const loadAcuerdos = useCallback(async () => {
    setLoadingAcuerdos(true)
    try {
      const url = showFinalizados
        ? "/api/rrhh/prestaciones-acuerdos"
        : "/api/rrhh/prestaciones-acuerdos?estado=En%20curso"
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setAcuerdos(data.data || [])
      } else {
        toast({ title: "Error", description: data.error || "No se pudieron cargar los acuerdos", variant: "destructive" })
      }
    } catch (err: any) {
      console.error("[v0] Error loading acuerdos:", err)
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoadingAcuerdos(false)
    }
  }, [showFinalizados, toast])

  useEffect(() => {
    loadAcuerdos()
  }, [loadAcuerdos])

  // ---- Derived values -----------------------------------------------------

  const montoPorCuotaPreview = useMemo(() => {
    const total = Number(form.monto_total)
    const cuotas = Number(form.numero_cuotas)
    if (total > 0 && cuotas > 0) return Number((total / cuotas).toFixed(2))
    return 0
  }, [form.monto_total, form.numero_cuotas])

  const totalEnCurso = acuerdos.filter((a) => a.estado === "En curso").length
  const saldoGlobal = acuerdos
    .filter((a) => a.estado === "En curso")
    .reduce((sum, a) => sum + Number(a.saldo_pendiente || 0), 0)

  // ---- Handlers -----------------------------------------------------------

  const resetForm = () => {
    setForm(emptyForm)
    setAcuerdoFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !form.nombre_ex_empleado.trim() ||
      !form.identificacion_ex_empleado.trim() ||
      !form.monto_total ||
      !form.numero_cuotas ||
      !form.fecha_acuerdo
    ) {
      toast({ title: "Campos incompletos", description: "Complete todos los campos obligatorios", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      // 1. Upload the agreement PDF (if provided) to documentos_rrhh in storage.
      // Reuses the generic /api/rrhh/upload endpoint which puts files in the
      // "Archivos" bucket under the supplied folder.
      let urlAcuerdo: string | null = null
      if (acuerdoFile) {
        const fd = new FormData()
        fd.append("file", acuerdoFile)
        fd.append("folder", "documentos_rrhh")
        const upRes = await fetch("/api/rrhh/upload", { method: "POST", body: fd })
        const upData = await upRes.json()
        if (!upRes.ok || !upData.success) {
          throw new Error(upData.error || "No se pudo subir el acuerdo")
        }
        urlAcuerdo = upData.url
      }

      // 2. Create the agreement with the manual ex-employee fields and url
      const res = await fetch("/api/rrhh/prestaciones-acuerdos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_ex_empleado: form.nombre_ex_empleado.trim(),
          identificacion_ex_empleado: form.identificacion_ex_empleado.trim(),
          urlacuerdo: urlAcuerdo,
          monto_total: Number(form.monto_total),
          numero_cuotas: Number(form.numero_cuotas),
          fecha_acuerdo: form.fecha_acuerdo,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Error al crear acuerdo")

      toast({
        title: "Acuerdo generado",
        description: `Se crearon ${form.numero_cuotas} cuotas por ${formatMoney(montoPorCuotaPreview)} cada una`,
      })
      resetForm()
      setActiveTab("control")
      loadAcuerdos()
    } catch (err: any) {
      console.error("[v0] Error creating acuerdo:", err)
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const openPlan = async (acuerdo: Acuerdo) => {
    setPlanAcuerdo(acuerdo)
    setLoadingPlan(true)
    try {
      const res = await fetch(`/api/rrhh/prestaciones-acuerdos/${acuerdo.id}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setPlanPagos(data.data.pagos || [])
    } catch (err: any) {
      console.error("[v0] Error loading plan:", err)
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoadingPlan(false)
    }
  }

  const closePlan = () => {
    setPlanAcuerdo(null)
    setPlanPagos([])
  }

  const openPayDialog = (pago: Pago) => {
    setPayingPago(pago)
    setPayFile(null)
    setPayDate(new Date().toISOString().slice(0, 10))
  }

  const closePayDialog = () => {
    setPayingPago(null)
    setPayFile(null)
  }

  const handleRegistrarPago = async () => {
    if (!payingPago) return
    setUploadingPay(true)
    try {
      let urlComprobante: string | null = null

      // 1. Upload receipt if provided, reusing the generic RRHH upload endpoint
      if (payFile) {
        const fd = new FormData()
        fd.append("file", payFile)
        fd.append("folder", "rrhh/prestaciones")
        const upRes = await fetch("/api/rrhh/upload", { method: "POST", body: fd })
        const upData = await upRes.json()
        if (!upRes.ok || !upData.success) throw new Error(upData.error || "Error al subir archivo")
        urlComprobante = upData.url
      }

      // 2. Mark cuota paid (server will auto-finalize agreement if all paid)
      const res = await fetch(`/api/rrhh/prestaciones-pagos/${payingPago.id}/pagar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url_comprobante: urlComprobante,
          fecha_pago: payDate,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      if (data.finalizado) {
        const nombre = data.empleado_nombre || planAcuerdo?.empleados?.nombre_completo || "el ex empleado"
        toast({
          title: "Prestaciones completadas",
          description: `Prestaciones de ${nombre} pagadas en su totalidad!`,
        })
        // Close the plan modal since the agreement is now finalized
        closePlan()
      } else {
        toast({ title: "Pago registrado", description: `Cuota ${payingPago.numero_cuota} marcada como pagada` })
        // Refresh the open plan modal in place
        if (planAcuerdo) openPlan(planAcuerdo)
      }

      closePayDialog()
      loadAcuerdos()
    } catch (err: any) {
      console.error("[v0] Error registering pago:", err)
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setUploadingPay(false)
    }
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-orange-500" />
            Prestaciones Ex Empleados
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Control de pagos fraccionados de liquidaciones y prestaciones
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-blue-100 p-2.5 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Acuerdos en curso</p>
              <p className="text-xl font-bold text-gray-900">{totalEnCurso}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-orange-100 p-2.5 rounded-lg">
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Saldo pendiente global</p>
              <p className="text-xl font-bold text-gray-900">{formatMoney(saldoGlobal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-green-100 p-2.5 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Finalizados</p>
              <p className="text-xl font-bold text-gray-900">
                {acuerdos.filter((a) => a.estado === "Finalizado").length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-2 w-full md:w-[420px]">
          <TabsTrigger value="control">Control y Seguimiento</TabsTrigger>
          <TabsTrigger value="registrar">Registrar Acuerdo</TabsTrigger>
        </TabsList>

        {/* === Tab 1: Control y Seguimiento === */}
        <TabsContent value="control" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm font-semibold text-gray-700">
                  Acuerdos {showFinalizados ? "(Todos)" : "En Curso"}
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowFinalizados((v) => !v)}
                  className="h-8 text-xs"
                >
                  {showFinalizados ? "Ver solo en curso" : "Ver finalizados"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAcuerdos ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                </div>
              ) : acuerdos.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    {showFinalizados ? "No hay acuerdos registrados" : "No hay acuerdos en curso"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left">
                        <th className="py-2 px-3 font-semibold text-gray-600">Ex Empleado</th>
                        <th className="py-2 px-3 font-semibold text-gray-600 text-right">Monto Total</th>
                        <th className="py-2 px-3 font-semibold text-gray-600 w-[280px]">Progreso</th>
                        <th className="py-2 px-3 font-semibold text-gray-600 text-right">Saldo Pendiente</th>
                        <th className="py-2 px-3 font-semibold text-gray-600 text-center">Estado</th>
                        <th className="py-2 px-3 font-semibold text-gray-600 text-center">Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acuerdos.map((a) => {
                        const pct =
                          a.cuotas_totales > 0 ? Math.round((a.cuotas_pagadas / a.cuotas_totales) * 100) : 0
                        const display = getExEmpleadoDisplay(a)
                        return (
                          <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="py-3 px-3">
                              <div className="font-medium text-gray-900 flex items-center gap-1.5">
                                {display.nombre}
                                {a.urlacuerdo && (
                                  <a
                                    href={a.urlacuerdo}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Ver acuerdo firmado"
                                    className="text-blue-500 hover:text-blue-700"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 font-mono">
                                {display.cedula}
                                {a.empleados?.empresa ? ` - ${a.empleados.empresa}` : ""}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-gray-900">
                              {formatMoney(a.monto_total)}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <Progress value={pct} className="h-2 flex-1" />
                                <span className="text-xs font-semibold text-gray-700 whitespace-nowrap min-w-[55px] text-right">
                                  {a.cuotas_pagadas}/{a.cuotas_totales}
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                Cuota: {formatMoney(a.monto_por_cuota)} c/u
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className={`font-semibold ${a.saldo_pendiente > 0 ? "text-orange-600" : "text-green-600"}`}>
                                {formatMoney(a.saldo_pendiente)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              {a.estado === "Finalizado" ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Finalizado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5">
                                  <Clock className="w-3 h-3" />
                                  En curso
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPlan(a)}
                                className="h-7 text-xs"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                Ver Plan
                              </Button>
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
        </TabsContent>

        {/* === Tab 2: Registrar Acuerdo === */}
        <TabsContent value="registrar" className="mt-4">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4 text-orange-500" />
                Nuevo Acuerdo de Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nombre del Ex Empleado *</Label>
                    <Input
                      value={form.nombre_ex_empleado}
                      onChange={(e) => setForm({ ...form, nombre_ex_empleado: e.target.value })}
                      className="mt-1"
                      placeholder="Ej: Juan Carlos Perez"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Cedula / Identificacion *</Label>
                    <Input
                      value={form.identificacion_ex_empleado}
                      onChange={(e) => setForm({ ...form, identificacion_ex_empleado: e.target.value })}
                      className="mt-1"
                      placeholder="0801-1990-12345"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Acuerdo Firmado (PDF)</Label>
                  <div className="mt-1">
                    <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-3 cursor-pointer hover:border-orange-300 hover:bg-orange-50/50 transition">
                      <Upload className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-600 truncate flex-1">
                        {acuerdoFile ? acuerdoFile.name : "Seleccionar PDF del acuerdo"}
                      </span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(e) => setAcuerdoFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Se almacenara en storage en la carpeta documentos_rrhh
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Monto Total a Pagar (HNL) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.monto_total}
                      onChange={(e) => setForm({ ...form, monto_total: e.target.value })}
                      className="mt-1"
                      placeholder="30000.00"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Cantidad de Cuotas (meses) *</Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                  value={form.numero_cuotas}
                  onChange={(e) => setForm({ ...form, numero_cuotas: e.target.value })}
                      className="mt-1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Fecha Primer Pago *</Label>
                  <Input
                    type="date"
                  value={form.fecha_acuerdo}
                  onChange={(e) => setForm({ ...form, fecha_acuerdo: e.target.value })}
                    className="mt-1"
                    required
                  />
                </div>

                {montoPorCuotaPreview > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-orange-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-orange-900">Resumen del acuerdo</p>
                        <p className="text-xs text-orange-700 mt-1">
                          Se generaran <strong>{form.numero_cuotas}</strong> cuotas mensuales por{" "}
                          <strong>{formatMoney(montoPorCuotaPreview)}</strong> cada una
                        </p>
                        <p className="text-xs text-orange-700">
                          Total: <strong>{formatMoney(Number(form.monto_total || 0))}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Limpiar
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Generar Acuerdo
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* === Plan de Pagos Modal === */}
      <Dialog open={!!planAcuerdo} onOpenChange={(o) => !o && closePlan()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              Plan de Pagos - {planAcuerdo ? getExEmpleadoDisplay(planAcuerdo).nombre : ""}
            </DialogTitle>
            {planAcuerdo?.urlacuerdo && (
              <a
                href={planAcuerdo.urlacuerdo}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline w-fit"
              >
                <FileText className="w-3.5 h-3.5" />
                Ver acuerdo firmado (PDF)
              </a>
            )}
          </DialogHeader>

          {planAcuerdo && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[10px] text-gray-500 uppercase">Monto Total</p>
                  <p className="text-sm font-bold text-gray-900">{formatMoney(planAcuerdo.monto_total)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[10px] text-gray-500 uppercase">Pagado</p>
                  <p className="text-sm font-bold text-green-600">
                    {planAcuerdo.cuotas_pagadas}/{planAcuerdo.cuotas_totales}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[10px] text-gray-500 uppercase">Saldo</p>
                  <p className="text-sm font-bold text-orange-600">{formatMoney(planAcuerdo.saldo_pendiente)}</p>
                </div>
              </div>

              {loadingPlan ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="py-2 px-2 text-left font-semibold text-gray-600">Cuota</th>
                        <th className="py-2 px-2 text-left font-semibold text-gray-600">Fecha Prog.</th>
                        <th className="py-2 px-2 text-right font-semibold text-gray-600">Monto</th>
                        <th className="py-2 px-2 text-center font-semibold text-gray-600">Estado</th>
                        <th className="py-2 px-2 text-center font-semibold text-gray-600">Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planPagos.map((p) => (
                        <tr key={p.id} className="border-b border-gray-100">
                          <td className="py-2 px-2 font-semibold text-gray-900">#{p.numero_cuota}</td>
                          <td className="py-2 px-2 text-gray-700">{formatDate(p.fecha_programada)}</td>
                          <td className="py-2 px-2 text-right font-semibold">{formatMoney(p.monto_cuota)}</td>
                          <td className="py-2 px-2 text-center">
                            {p.estado === "Pagado" ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  Pagado
                                </span>
                                {p.fecha_pago && (
                                  <span className="text-[10px] text-gray-400">{formatDate(p.fecha_pago)}</span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {p.estado === "Pendiente" ? (
                              <Button size="sm" onClick={() => openPayDialog(p)} className="h-6 text-[11px] bg-green-600 hover:bg-green-700">
                                <DollarSign className="w-3 h-3 mr-0.5" />
                                Pagar
                              </Button>
                            ) : p.url_comprobante ? (
                              <a
                                href={p.url_comprobante}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                              >
                                <FileText className="w-3 h-3" />
                                Comprobante
                              </a>
                            ) : (
                              <span className="text-[10px] text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* === Register Pago Dialog === */}
      <Dialog open={!!payingPago} onOpenChange={(o) => !o && closePayDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Registrar Pago - Cuota #{payingPago?.numero_cuota}
            </DialogTitle>
          </DialogHeader>

          {payingPago && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-700">
                  Monto a registrar: <strong>{formatMoney(payingPago.monto_cuota)}</strong>
                </p>
                <p className="text-xs text-green-700">
                  Fecha programada: <strong>{formatDate(payingPago.fecha_programada)}</strong>
                </p>
              </div>

              <div>
                <Label className="text-xs">Fecha de Pago</Label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Comprobante (transferencia / recibo)</Label>
                <div className="mt-1">
                  <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-3 cursor-pointer hover:border-orange-300 hover:bg-orange-50/50 transition">
                    <Upload className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-600 truncate flex-1">
                      {payFile ? payFile.name : "Seleccionar archivo (PDF o imagen)"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => setPayFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>

            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closePayDialog} disabled={uploadingPay}>
              Cancelar
            </Button>
            <Button
              onClick={handleRegistrarPago}
              disabled={uploadingPay}
              className="bg-green-600 hover:bg-green-700"
            >
              {uploadingPay ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Marcar Pagado
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
