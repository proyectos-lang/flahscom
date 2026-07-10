"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { 
  Banknote, 
  Send, 
  Check, 
  X, 
  Loader2, 
  Search,
  PenTool,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  History,
  Filter
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
  empresa: string
  activo: boolean
}

interface Adelanto {
  id: number
  empleado_id: number
  monto: number
  justificacion: string
  periodo_descuento: string
  url_firma_solicitante: string | null
  url_firma_aprobador: string | null
  estado: "pendiente" | "aprobada" | "rechazada"
  fecha_solicitud: string
  fecha_aprobacion: string | null
}

export default function AdelantosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [adelantosPendientes, setAdelantosPendientes] = useState<Adelanto[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  // Form state
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null)
  const [openCombobox, setOpenCombobox] = useState(false)
  const [monto, setMonto] = useState("")
  const [justificacion, setJustificacion] = useState("")
  const [periodoDescuento, setPeriodoDescuento] = useState("")

  // Signature canvas refs
  const solicitanteCanvasRef = useRef<HTMLCanvasElement>(null)
  const aprobadorCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawingSolicitante, setIsDrawingSolicitante] = useState(false)
  const [isDrawingAprobador, setIsDrawingAprobador] = useState(false)
  const [hasSolicitanteSignature, setHasSolicitanteSignature] = useState(false)
  const [hasAprobadorSignature, setHasAprobadorSignature] = useState(false)

  // Approval dialog
  const [approvalDialog, setApprovalDialog] = useState<{ open: boolean; adelanto: Adelanto | null }>({ open: false, adelanto: null })
  const [empleadosMap, setEmpleadosMap] = useState<Map<number, Empleado>>(new Map())

  // Historial state
  const [historialAdelantos, setHistorialAdelantos] = useState<Adelanto[]>([])
  const [historialSearch, setHistorialSearch] = useState("")
  const [historialEstadoFilter, setHistorialEstadoFilter] = useState<string>("todos")
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  const loadEmpleados = useCallback(async () => {
    try {
      const res = await fetch("/api/rrhh/empleados")
      const data = await res.json()
      if (data.success) {
        setEmpleados(data.data.filter((e: Empleado) => e.activo))
        const map = new Map<number, Empleado>()
        data.data.forEach((e: Empleado) => map.set(e.id, e))
        setEmpleadosMap(map)
      }
    } catch (error) {
      console.error("Error loading empleados:", error)
    }
  }, [])

  const loadAdelantosPendientes = useCallback(async () => {
    try {
      const res = await fetch("/api/rrhh/adelantos?estado=pendiente")
      const data = await res.json()
      if (data.success) {
        setAdelantosPendientes(data.data)
      }
    } catch (error) {
      console.error("Error loading adelantos:", error)
    }
  }, [])

  const loadHistorialAdelantos = useCallback(async () => {
    setLoadingHistorial(true)
    try {
      const res = await fetch("/api/rrhh/adelantos")
      const data = await res.json()
      if (data.success) {
        setHistorialAdelantos(data.data)
      }
    } catch (error) {
      console.error("Error loading historial:", error)
    } finally {
      setLoadingHistorial(false)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([loadEmpleados(), loadAdelantosPendientes(), loadHistorialAdelantos()])
      setLoading(false)
    }
    loadData()
  }, [loadEmpleados, loadAdelantosPendientes, loadHistorialAdelantos])

  // Signature canvas functions
  const initCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.strokeStyle = "#1f2937"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
  }

  useEffect(() => {
    initCanvas(solicitanteCanvasRef.current)
    initCanvas(aprobadorCanvasRef.current)
  }, [])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    setIsDrawing: (v: boolean) => void
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    setIsDrawing(true)
    const { x, y } = getCoordinates(e, canvas)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    isDrawing: boolean,
    setHasSignature: (v: boolean) => void
  ) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCoordinates(e, canvas)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = (setIsDrawing: (v: boolean) => void) => {
    setIsDrawing(false)
  }

  const clearCanvas = (canvasRef: React.RefObject<HTMLCanvasElement | null>, setHasSignature: (v: boolean) => void) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    initCanvas(canvas)
  }

  const getCanvasDataUrl = (canvasRef: React.RefObject<HTMLCanvasElement | null>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.toDataURL("image/png")
  }

  const handleSubmitSolicitud = async () => {
    if (!selectedEmpleado) {
      toast({ title: "Error", description: "Seleccione un empleado", variant: "destructive" })
      return
    }
    if (!monto || parseFloat(monto) <= 0) {
      toast({ title: "Error", description: "Ingrese un monto valido", variant: "destructive" })
      return
    }
    if (!justificacion.trim()) {
      toast({ title: "Error", description: "Ingrese una justificacion", variant: "destructive" })
      return
    }
    if (!periodoDescuento) {
      toast({ title: "Error", description: "Seleccione el periodo de descuento", variant: "destructive" })
      return
    }
    if (!hasSolicitanteSignature) {
      toast({ title: "Error", description: "Se requiere la firma del empleado", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const firmaUrl = getCanvasDataUrl(solicitanteCanvasRef)

      const res = await fetch("/api/rrhh/adelantos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empleado_id: selectedEmpleado.id,
          monto: parseFloat(monto),
          justificacion,
          periodo_descuento: periodoDescuento,
          url_firma_solicitante: firmaUrl,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast({ title: "Exito", description: "Solicitud de adelanto enviada correctamente" })
        // Reset form
        setSelectedEmpleado(null)
        setMonto("")
        setJustificacion("")
        setPeriodoDescuento("")
        clearCanvas(solicitanteCanvasRef, setHasSolicitanteSignature)
        await loadAdelantosPendientes()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("Error submitting adelanto:", error)
      toast({ title: "Error", description: "No se pudo enviar la solicitud", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAprobar = async () => {
    if (!approvalDialog.adelanto) return
    if (!hasAprobadorSignature) {
      toast({ title: "Error", description: "Se requiere la firma del aprobador", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const firmaUrl = getCanvasDataUrl(aprobadorCanvasRef)

      const res = await fetch(`/api/rrhh/adelantos/${approvalDialog.adelanto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: "aprobada",
          url_firma_aprobador: firmaUrl,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast({ title: "Exito", description: "Adelanto aprobado correctamente" })
        setApprovalDialog({ open: false, adelanto: null })
        clearCanvas(aprobadorCanvasRef, setHasAprobadorSignature)
        await loadAdelantosPendientes()
        await loadHistorialAdelantos()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("Error approving adelanto:", error)
      toast({ title: "Error", description: "No se pudo aprobar el adelanto", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRechazar = async (adelanto: Adelanto) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/rrhh/adelantos/${adelanto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "rechazada" }),
      })

      const data = await res.json()
      if (data.success) {
        toast({ title: "Rechazado", description: "Solicitud de adelanto rechazada" })
        await loadAdelantosPendientes()
        await loadHistorialAdelantos()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("Error rejecting adelanto:", error)
      toast({ title: "Error", description: "No se pudo rechazar el adelanto", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered historial
  const filteredHistorial = historialAdelantos.filter((adelanto) => {
    const empleado = empleadosMap.get(adelanto.empleado_id)
    const nombreMatch = empleado?.nombre_completo?.toLowerCase().includes(historialSearch.toLowerCase()) ?? false
    const estadoMatch = historialEstadoFilter === "todos" || adelanto.estado === historialEstadoFilter
    return nombreMatch && estadoMatch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adelantos de Nomina</h1>
          <p className="text-sm text-gray-500 mt-1">Solicitudes y aprobaciones de adelantos salariales</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            {adelantosPendientes.length} Pendientes
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="solicitud" className="space-y-4">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="solicitud" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Nueva Solicitud
          </TabsTrigger>
          <TabsTrigger value="aprobaciones" className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            Aprobaciones
            {adelantosPendientes.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-orange-500 text-white text-[10px] rounded-full">
                {adelantosPendientes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Nueva Solicitud */}
        <TabsContent value="solicitud">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Banknote className="w-5 h-5 text-orange-500" />
                Solicitar Adelanto de Nomina
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Empleado Selector - Combobox */}
                  <div className="space-y-2">
                    <Label>Empleado</Label>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCombobox}
                          className="w-full justify-between h-auto py-2"
                        >
                          {selectedEmpleado ? (
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{selectedEmpleado.nombre_completo}</span>
                              <span className="text-xs text-gray-500">{selectedEmpleado.identificacion} - {selectedEmpleado.empresa}</span>
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
                                    setSelectedEmpleado(emp)
                                    setOpenCombobox(false)
                                  }}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{emp.nombre_completo}</span>
                                    <span className="text-xs text-gray-500">{emp.identificacion} - {emp.empresa}</span>
                                  </div>
                                  {selectedEmpleado?.id === emp.id && (
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

                  {/* Monto */}
                  <div className="space-y-2">
                    <Label>Monto (L)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Periodo de Descuento */}
                  <div className="space-y-2">
                    <Label>Mes/Quincena a Descontar</Label>
                    <Input
                      type="date"
                      value={periodoDescuento}
                      onChange={(e) => setPeriodoDescuento(e.target.value)}
                    />
                  </div>

                  {/* Justificacion */}
                  <div className="space-y-2">
                    <Label>Justificacion</Label>
                    <Textarea
                      placeholder="Motivo del adelanto..."
                      value={justificacion}
                      onChange={(e) => setJustificacion(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>

                {/* Right Column - Signature */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <PenTool className="w-4 h-4" />
                      Firma del Empleado
                    </Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-gray-50">
                      <canvas
                        ref={solicitanteCanvasRef}
                        width={400}
                        height={200}
                        className="w-full bg-white rounded border cursor-crosshair touch-none"
                        onMouseDown={(e) => startDrawing(e, solicitanteCanvasRef, setIsDrawingSolicitante)}
                        onMouseMove={(e) => draw(e, solicitanteCanvasRef, isDrawingSolicitante, setHasSolicitanteSignature)}
                        onMouseUp={() => stopDrawing(setIsDrawingSolicitante)}
                        onMouseLeave={() => stopDrawing(setIsDrawingSolicitante)}
                        onTouchStart={(e) => startDrawing(e, solicitanteCanvasRef, setIsDrawingSolicitante)}
                        onTouchMove={(e) => draw(e, solicitanteCanvasRef, isDrawingSolicitante, setHasSolicitanteSignature)}
                        onTouchEnd={() => stopDrawing(setIsDrawingSolicitante)}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {hasSolicitanteSignature ? "Firma registrada" : "Firme en el recuadro"}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => clearCanvas(solicitanteCanvasRef, setHasSolicitanteSignature)}
                          className="text-xs"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Limpiar
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmitSolicitud}
                    disabled={submitting}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Enviar Solicitud
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Aprobaciones */}
        <TabsContent value="aprobaciones">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Check className="w-5 h-5 text-green-500" />
                Solicitudes Pendientes de Aprobacion
              </CardTitle>
            </CardHeader>
            <CardContent>
              {adelantosPendientes.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No hay solicitudes pendientes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {adelantosPendientes.map((adelanto) => {
                    const empleado = empleadosMap.get(adelanto.empleado_id)
                    return (
                      <div
                        key={adelanto.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{empleado?.nombre_completo || `Empleado #${adelanto.empleado_id}`}</span>
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                {empleado?.empresa}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="font-semibold text-lg text-orange-600">
                                L{adelanto.monto.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Descontar: {adelanto.periodo_descuento}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                              {adelanto.justificacion}
                            </p>
                            <p className="text-xs text-gray-400">
                              Solicitado: {adelanto.fecha_solicitud}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRechazar(adelanto)}
                              disabled={submitting}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Rechazar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setApprovalDialog({ open: true, adelanto })
                                setTimeout(() => initCanvas(aprobadorCanvasRef.current), 100)
                              }}
                              disabled={submitting}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Aprobar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Historial */}
        <TabsContent value="historial">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="w-5 h-5 text-blue-500" />
                Historial de Adelantos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por nombre de empleado..."
                      value={historialSearch}
                      onChange={(e) => setHistorialSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={historialEstadoFilter}
                    onChange={(e) => setHistorialEstadoFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="aprobada">Aprobada</option>
                    <option value="rechazada">Rechazada</option>
                    <option value="pendiente">Pendiente</option>
                  </select>
                </div>
              </div>

              {/* Results Table */}
              {loadingHistorial ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              ) : filteredHistorial.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No se encontraron adelantos</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Empleado</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Fecha Solicitud</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">Monto</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Periodo Descuento</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Justificacion</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Estado</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Fecha Aprobacion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredHistorial.map((adelanto) => {
                        const empleado = empleadosMap.get(adelanto.empleado_id)
                        return (
                          <tr key={adelanto.id} className="hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex flex-col">
                                <span className="font-medium">{empleado?.nombre_completo || `Empleado #${adelanto.empleado_id}`}</span>
                                <span className="text-xs text-gray-500">{empleado?.empresa}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {new Date(adelanto.fecha_solicitud).toLocaleDateString("es-HN")}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-orange-600">
                              L{adelanto.monto.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {adelanto.periodo_descuento}
                            </td>
                            <td className="py-3 px-4 text-gray-600 max-w-[200px] truncate" title={adelanto.justificacion}>
                              {adelanto.justificacion}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {adelanto.estado === "aprobada" && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                  <CheckCircle className="w-3 h-3" />
                                  Aprobada
                                </span>
                              )}
                              {adelanto.estado === "rechazada" && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                  <XCircle className="w-3 h-3" />
                                  Rechazada
                                </span>
                              )}
                              {adelanto.estado === "pendiente" && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                  <Clock className="w-3 h-3" />
                                  Pendiente
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {adelanto.estado === "aprobada" && adelanto.fecha_aprobacion
                                ? new Date(adelanto.fecha_aprobacion).toLocaleDateString("es-HN")
                                : "-"}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary */}
              {filteredHistorial.length > 0 && (
                <div className="flex items-center justify-between pt-4 border-t text-sm text-gray-500">
                  <span>Mostrando {filteredHistorial.length} registro(s)</span>
                  <span>
                    Total aprobados: L{filteredHistorial
                      .filter(a => a.estado === "aprobada")
                      .reduce((sum, a) => sum + a.monto, 0)
                      .toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval Dialog with Signature */}
      <Dialog open={approvalDialog.open} onOpenChange={(open) => {
        if (!open) {
          setApprovalDialog({ open: false, adelanto: null })
          clearCanvas(aprobadorCanvasRef, setHasAprobadorSignature)
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Aprobar Adelanto
            </DialogTitle>
          </DialogHeader>
          
          {approvalDialog.adelanto && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Empleado:</span>
                  <span className="font-medium">
                    {empleadosMap.get(approvalDialog.adelanto.empleado_id)?.nombre_completo}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Monto:</span>
                  <span className="font-semibold text-orange-600">
                    L{approvalDialog.adelanto.monto.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Periodo descuento:</span>
                  <span className="text-sm">{approvalDialog.adelanto.periodo_descuento}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <PenTool className="w-4 h-4" />
                  Firma del Aprobador (Jefatura)
                </Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-gray-50">
                  <canvas
                    ref={aprobadorCanvasRef}
                    width={350}
                    height={150}
                    className="w-full bg-white rounded border cursor-crosshair touch-none"
                    onMouseDown={(e) => startDrawing(e, aprobadorCanvasRef, setIsDrawingAprobador)}
                    onMouseMove={(e) => draw(e, aprobadorCanvasRef, isDrawingAprobador, setHasAprobadorSignature)}
                    onMouseUp={() => stopDrawing(setIsDrawingAprobador)}
                    onMouseLeave={() => stopDrawing(setIsDrawingAprobador)}
                    onTouchStart={(e) => startDrawing(e, aprobadorCanvasRef, setIsDrawingAprobador)}
                    onTouchMove={(e) => draw(e, aprobadorCanvasRef, isDrawingAprobador, setHasAprobadorSignature)}
                    onTouchEnd={() => stopDrawing(setIsDrawingAprobador)}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {hasAprobadorSignature ? "Firma registrada" : "Firme en el recuadro"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => clearCanvas(aprobadorCanvasRef, setHasAprobadorSignature)}
                      className="text-xs"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Limpiar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApprovalDialog({ open: false, adelanto: null })
                clearCanvas(aprobadorCanvasRef, setHasAprobadorSignature)
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAprobar}
              disabled={submitting || !hasAprobadorSignature}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Confirmar Aprobacion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
