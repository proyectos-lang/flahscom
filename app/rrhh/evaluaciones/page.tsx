"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { exportToExcel } from "@/lib/export-excel"
import { 
  Award, 
  Plus, 
  Search, 
  Loader2,
  Star,
  TrendingUp,
  Clock,
  CheckCircle,
  Eye,
  Link2,
  Users,
  Copy,
  Download,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

interface Empleado {
  id: number
  nombre_completo: string
  identificacion: string
  cargo: string
  empresa: string
}

interface Evaluacion {
  id: number
  empleado_id: number
  evaluador: string
  fecha_evaluacion: string
  periodo: string
  puntaje_total: number
  calificacion: string
  productividad: number
  puntualidad: number
  trabajo_equipo: number
  comunicacion: number
  iniciativa: number
  comentarios: string
  estado: string
}

const criterios = [
  { key: "productividad", label: "Productividad", description: "Rendimiento y eficiencia en el trabajo" },
  { key: "puntualidad", label: "Puntualidad", description: "Cumplimiento de horarios y plazos" },
  { key: "trabajo_equipo", label: "Trabajo en Equipo", description: "Colaboracion con companeros" },
  { key: "comunicacion", label: "Comunicacion", description: "Claridad y efectividad al comunicarse" },
  { key: "iniciativa", label: "Iniciativa", description: "Proactividad y propuestas de mejora" },
]

export default function EvaluacionesPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [activeTab, setActiveTab] = useState("evaluaciones")
  const [searchEmpleados, setSearchEmpleados] = useState("")
  const { toast } = useToast()

  // Dialog state
  const [showEvaluarDialog, setShowEvaluarDialog] = useState(false)
  const [showDetalleDialog, setShowDetalleDialog] = useState(false)
  const [openCombobox, setOpenCombobox] = useState(false)
  const [selectedEvaluacion, setSelectedEvaluacion] = useState<Evaluacion | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [form, setForm] = useState({
    empleado_id: 0,
    evaluador: "",
    periodo: "",
    productividad: 5,
    puntualidad: 5,
    trabajo_equipo: 5,
    comunicacion: 5,
    iniciativa: 5,
    comentarios: "",
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load employees
      const empRes = await fetch("/api/rrhh/empleados")
      const empData = await empRes.json()
      if (empData.success) {
        setEmpleados(empData.data.filter((e: Empleado & { activo: boolean }) => e.activo === true))
      }

      // Load evaluations
      const evalRes = await fetch("/api/rrhh/evaluaciones")
      const evalData = await evalRes.json()
      if (evalData.success) {
        setEvaluaciones(evalData.data || [])
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

  const calcularPuntaje = () => {
    const total = form.productividad + form.puntualidad + form.trabajo_equipo + form.comunicacion + form.iniciativa
    return total / 5
  }

  const getCalificacion = (puntaje: number) => {
    if (puntaje >= 9) return "Excelente"
    if (puntaje >= 7) return "Bueno"
    if (puntaje >= 5) return "Regular"
    return "Deficiente"
  }

  const handleEvaluar = async () => {
    if (!form.empleado_id || !form.evaluador || !form.periodo) {
      toast({
        title: "Error",
        description: "Complete todos los campos obligatorios",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const puntaje = calcularPuntaje()
      const res = await fetch("/api/rrhh/evaluaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          puntaje_total: puntaje,
          calificacion: getCalificacion(puntaje),
        }),
      })
      const data = await res.json()

      if (data.success) {
        toast({ title: "Exito", description: "Evaluacion registrada correctamente" })
        setShowEvaluarDialog(false)
        setForm({
          empleado_id: 0,
          evaluador: "",
          periodo: "",
          productividad: 5,
          puntualidad: 5,
          trabajo_equipo: 5,
          comunicacion: 5,
          iniciativa: 5,
          comentarios: "",
        })
        loadData()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar la evaluacion",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const completarEvaluacion = async (evaluacionId: number) => {
    try {
      const res = await fetch(`/api/rrhh/evaluaciones/${evaluacionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "completada" }),
      })
      const data = await res.json()

      if (data.success) {
        toast({ title: "Exito", description: "Evaluacion completada" })
        loadData()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo completar la evaluacion",
        variant: "destructive",
      })
    }
  }

  const stats = {
    total: evaluaciones.length,
    pendientes: evaluaciones.filter(e => e.estado === "pendiente").length,
    completadas: evaluaciones.filter(e => e.estado === "completada").length,
    promedioGeneral: evaluaciones.length > 0 
      ? (evaluaciones.reduce((sum, e) => sum + (e.puntaje_total || 0), 0) / evaluaciones.length).toFixed(1)
      : "0.0",
  }

  const filteredEvaluaciones = evaluaciones.filter(eva => {
    const empleado = empleados.find(e => e.id === eva.empleado_id)
    const matchSearch = empleado?.nombre_completo?.toLowerCase().includes(search.toLowerCase()) ||
      eva.evaluador?.toLowerCase().includes(search.toLowerCase())
    const matchEstado = filterEstado === "todos" || eva.estado === filterEstado
    return matchSearch && matchEstado
  })

  // Export filtered evaluaciones as a CSV file (opens natively in Excel)
  const exportEvaluacionesExcel = () => {
    if (!filteredEvaluaciones || filteredEvaluaciones.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay evaluaciones para exportar",
        variant: "destructive",
      })
      return
    }

    const headers = [
      "ID",
      "Empleado",
      "Identificacion",
      "Empresa",
      "Evaluador",
      "Periodo",
      "Fecha Evaluacion",
      "Productividad",
      "Puntualidad",
      "Trabajo Equipo",
      "Comunicacion",
      "Iniciativa",
      "Puntaje Total",
      "Calificacion",
      "Estado",
      "Comentarios",
    ]

    const rows = filteredEvaluaciones.map((eva) => {
      const emp = empleados.find((e) => e.id === eva.empleado_id)
      return [
        eva.id,
        emp?.nombre_completo || "-",
        emp?.identificacion || "-",
        emp?.empresa || "-",
        eva.evaluador || "",
        eva.periodo || "",
        eva.fecha_evaluacion || "",
        eva.productividad ?? 0,
        eva.puntualidad ?? 0,
        eva.trabajo_equipo ?? 0,
        eva.comunicacion ?? 0,
        eva.iniciativa ?? 0,
        Number(eva.puntaje_total || 0),
        eva.calificacion || "",
        eva.estado || "",
        eva.comentarios || "",
      ]
    })

    const today = new Date().toISOString().slice(0, 10)
    exportToExcel({ filename: `evaluaciones_${today}`, sheetName: "Evaluaciones", headers, rows })

    toast({
      title: "Exportado",
      description: `Se exportaron ${filteredEvaluaciones.length} evaluaciones`,
    })
  }

  const filteredEmpleadosForLinks = empleados.filter(emp =>
    emp.nombre_completo?.toLowerCase().includes(searchEmpleados.toLowerCase()) ||
    emp.identificacion?.toLowerCase().includes(searchEmpleados.toLowerCase()) ||
    emp.cargo?.toLowerCase().includes(searchEmpleados.toLowerCase())
  )

  const copyLinkToClipboard = (empleadoId: number) => {
    const baseUrl = window.location.origin
    // Short, share-friendly URL (also works when sent via WhatsApp/SMS).
    // This route redirects server-side to /evaluacion-externa/[id].
    const link = `${baseUrl}/evaluacion/${empleadoId}`
    const empleado = empleados.find((e) => e.id === empleadoId)
    const nombre = empleado?.nombre_completo || "el empleado"
    navigator.clipboard.writeText(link).then(() => {
      toast({
        title: "Enlace copiado",
        description: `Envialo al coordinador de ${nombre}`,
      })
    }).catch(() => {
      toast({
        title: "Error",
        description: "No se pudo copiar el link",
        variant: "destructive",
      })
    })
  }

  const renderStars = (value: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
          <Star
            key={i}
            className={`w-3 h-3 ${i <= value ? "text-amber-400 fill-amber-400" : "text-gray-200"}`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evaluaciones de Desempeno</h1>
          <p className="text-sm text-gray-500 mt-1">Evalua el rendimiento del personal</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={exportEvaluacionesExcel}
            disabled={evaluaciones.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
          <Button onClick={() => setShowEvaluarDialog(true)} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Evaluacion
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="evaluaciones" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Evaluaciones
          </TabsTrigger>
          <TabsTrigger value="compartir" className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Compartir Links
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evaluaciones" className="space-y-6 mt-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Award className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Pendientes</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pendientes}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Completadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.completadas}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Promedio</p>
                <p className="text-2xl font-bold text-purple-600">{stats.promedioGeneral}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por empleado o evaluador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="completada">Completadas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Evaluations List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Award className="w-4 h-4 text-orange-500" />
            Evaluaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : filteredEvaluaciones.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No hay evaluaciones registradas</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">Empleado</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">Evaluador</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">Periodo</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-600">Puntaje</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-600">Calificacion</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-600">Estado</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvaluaciones.map((eva) => {
                    const empleado = empleados.find(e => e.id === eva.empleado_id)
                    return (
                      <tr key={eva.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-3">
                          <div>
                            <p className="font-medium text-gray-900">{empleado?.nombre_completo || "Empleado"}</p>
                            <p className="text-xs text-gray-400">{empleado?.cargo}</p>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-gray-600">{eva.evaluador}</td>
                        <td className="py-3 px-3 text-gray-600">{eva.periodo}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-lg font-bold text-gray-900">{eva.puntaje_total?.toFixed(1)}</span>
                          <span className="text-xs text-gray-400">/10</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            eva.calificacion === "Excelente"
                              ? "bg-green-100 text-green-700"
                              : eva.calificacion === "Bueno"
                              ? "bg-blue-100 text-blue-700"
                              : eva.calificacion === "Regular"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {eva.calificacion}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            eva.estado === "completada"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {eva.estado === "completada" ? "Completada" : "Pendiente"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setSelectedEvaluacion(eva); setShowDetalleDialog(true) }}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="w-4 h-4 text-gray-500" />
                            </Button>
                            {eva.estado !== "completada" && (
                              <Button
                                size="sm"
                                onClick={() => completarEvaluacion(eva.id)}
                                className="bg-green-500 hover:bg-green-600 h-7 text-xs"
                              >
                                Completar
                              </Button>
                            )}
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

      {/* New Evaluation Dialog */}
      <Dialog open={showEvaluarDialog} onOpenChange={setShowEvaluarDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Evaluacion de Desempeno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                          {empleados.find(e => e.id === form.empleado_id)?.nombre_completo}
                        </span>
                        <span className="text-xs text-gray-500">
                          {empleados.find(e => e.id === form.empleado_id)?.identificacion} - {empleados.find(e => e.id === form.empleado_id)?.empresa}
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
                              <span className="text-xs text-gray-500">{emp.identificacion} - {emp.empresa}</span>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Evaluador *</Label>
                <Input
                  value={form.evaluador}
                  onChange={(e) => setForm({ ...form, evaluador: e.target.value })}
                  placeholder="Nombre del evaluador"
                />
              </div>
              <div>
                <Label>Periodo *</Label>
                <Input
                  value={form.periodo}
                  onChange={(e) => setForm({ ...form, periodo: e.target.value })}
                  placeholder="Ej: Q1 2026"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Criterios de Evaluacion (1-10)</h4>
              <div className="space-y-4">
                {criterios.map(criterio => (
                  <div key={criterio.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">{criterio.label}</Label>
                      <span className="text-sm font-medium text-orange-600">
                        {form[criterio.key as keyof typeof form]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{criterio.description}</p>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={form[criterio.key as keyof typeof form] as number}
                      onChange={(e) => setForm({ ...form, [criterio.key]: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-orange-50 p-3 rounded-lg text-center">
              <p className="text-sm text-gray-600">Puntaje Total</p>
              <p className="text-2xl font-bold text-orange-600">{calcularPuntaje().toFixed(1)}</p>
              <p className="text-sm font-medium text-gray-700">{getCalificacion(calcularPuntaje())}</p>
            </div>

            <div>
              <Label>Comentarios</Label>
              <Textarea
                value={form.comentarios}
                onChange={(e) => setForm({ ...form, comentarios: e.target.value })}
                placeholder="Observaciones adicionales..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEvaluarDialog(false)}>Cancelar</Button>
            <Button onClick={handleEvaluar} disabled={submitting} className="bg-orange-500 hover:bg-orange-600">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evaluation Detail Dialog */}
      <Dialog open={showDetalleDialog} onOpenChange={setShowDetalleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de Evaluacion</DialogTitle>
          </DialogHeader>
          {selectedEvaluacion && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-orange-600">{selectedEvaluacion.puntaje_total?.toFixed(1)}</p>
                <p className="text-lg font-medium text-gray-700">{selectedEvaluacion.calificacion}</p>
                <p className="text-sm text-gray-400">Evaluado por: {selectedEvaluacion.evaluador}</p>
              </div>

              <div className="space-y-3 border-t pt-4">
                {criterios.map(criterio => {
                  const value = selectedEvaluacion[criterio.key as keyof Evaluacion] as number
                  return (
                    <div key={criterio.key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{criterio.label}</span>
                      <div className="flex items-center gap-2">
                        {renderStars(value)}
                        <span className="text-sm font-medium w-6 text-right">{value}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {selectedEvaluacion.comentarios && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700">Comentarios:</p>
                  <p className="text-sm text-gray-600 mt-1">{selectedEvaluacion.comentarios}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetalleDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>

        {/* Compartir Links Tab */}
        <TabsContent value="compartir" className="space-y-6 mt-6">
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-600" />
                Generar Links de Evaluacion Externa
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                Copie el link de evaluacion para enviarlo a los jefes de departamento. Ellos podran evaluar sin necesidad de acceder al panel de administracion.
              </p>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar empleado por nombre, identificacion o cargo..."
                  value={searchEmpleados}
                  onChange={(e) => setSearchEmpleados(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Listado de Empleados ({filteredEmpleadosForLinks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : filteredEmpleadosForLinks.length === 0 ? (
                <p className="text-center text-gray-400 py-12">No se encontraron empleados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left py-3 px-3 font-semibold text-gray-600">Empleado</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-600">Identificacion</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-600">Cargo</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-600">Empresa</th>
                        <th className="text-center py-3 px-3 font-semibold text-gray-600">Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmpleadosForLinks.map((emp) => (
                        <tr key={emp.id} className="border-b border-gray-50 hover:bg-blue-50 transition-colors">
                          <td className="py-3 px-3">
                            <p className="font-medium text-gray-900">{emp.nombre_completo}</p>
                          </td>
                          <td className="py-3 px-3 font-mono text-gray-600">{emp.identificacion}</td>
                          <td className="py-3 px-3 text-gray-600">{emp.cargo || "-"}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              emp.empresa === "FLASHCOM"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-blue-100 text-blue-700"
                            }`}>
                              {emp.empresa || "-"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Button
                              size="sm"
                              onClick={() => copyLinkToClipboard(emp.id)}
                              className="bg-blue-500 hover:bg-blue-600 h-8"
                            >
                              <Copy className="w-3 h-3 mr-1.5" />
                              Copiar Link de Evaluacion
                            </Button>
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
    </div>
  )
}
