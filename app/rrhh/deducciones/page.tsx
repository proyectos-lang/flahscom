"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { 
  MinusCircle, 
  Search, 
  Plus, 
  Loader2,
  Calendar,
  User,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle
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

interface Empleado {
  id: number
  nombre_completo: string
  identificacion: string
  empresa: string
}

interface Deduccion {
  id: number
  empleado_id: number
  empleado_nombre: string
  concepto: string
  monto: number
  fecha_aplicacion: string
}

export default function DeduccionesPage() {
  const { toast } = useToast()
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [deducciones, setDeducciones] = useState<Deduccion[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null)
  const [openCombobox, setOpenCombobox] = useState(false)
  const [concepto, setConcepto] = useState("")
  const [monto, setMonto] = useState("")
  const [fechaAplicacion, setFechaAplicacion] = useState("")

  const loadEmpleados = useCallback(async () => {
    try {
      const res = await fetch("/api/rrhh/empleados?activo=true")
      const data = await res.json()
      if (data.success) {
        setEmpleados(data.data || [])
      }
    } catch (error) {
      console.error("Error loading empleados:", error)
    }
  }, [])

  const loadDeducciones = useCallback(async () => {
    try {
      const res = await fetch("/api/rrhh/deducciones?limit=100")
      const data = await res.json()
      if (data.success) {
        setDeducciones(data.data || [])
      }
    } catch (error) {
      console.error("Error loading deducciones:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEmpleados()
    loadDeducciones()
  }, [loadEmpleados, loadDeducciones])

  const handleSubmit = async () => {
    if (!selectedEmpleado) {
      toast({ title: "Error", description: "Seleccione un empleado", variant: "destructive" })
      return
    }
    if (!concepto.trim()) {
      toast({ title: "Error", description: "Ingrese el concepto de la deduccion", variant: "destructive" })
      return
    }
    if (!monto || parseFloat(monto) <= 0) {
      toast({ title: "Error", description: "Ingrese un monto valido", variant: "destructive" })
      return
    }
    if (!fechaAplicacion) {
      toast({ title: "Error", description: "Seleccione la fecha de aplicacion", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/rrhh/deducciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empleado_id: selectedEmpleado.id,
          concepto: concepto.trim(),
          monto: parseFloat(monto),
          fecha_aplicacion: fechaAplicacion,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast({ title: "Exito", description: "Deduccion registrada correctamente" })
        // Reset form
        setSelectedEmpleado(null)
        setConcepto("")
        setMonto("")
        setFechaAplicacion("")
        // Reload deducciones
        loadDeducciones()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "No se pudo registrar la deduccion", 
        variant: "destructive" 
      })
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: "HNL",
      minimumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-"
    const date = new Date(dateStr + "T00:00:00")
    return date.toLocaleDateString("es-HN", { day: "2-digit", month: "short", year: "numeric" })
  }

  // Calculate totals
  const totalDeducciones = deducciones.reduce((sum, d) => sum + (d.monto || 0), 0)
  const deduccionesEsteMes = deducciones.filter(d => {
    const fecha = new Date(d.fecha_aplicacion)
    const now = new Date()
    return fecha.getMonth() === now.getMonth() && fecha.getFullYear() === now.getFullYear()
  })
  const totalEsteMes = deduccionesEsteMes.reduce((sum, d) => sum + (d.monto || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deducciones de Nomina</h1>
          <p className="text-sm text-gray-500 mt-1">Registro y control de descuentos al personal</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <MinusCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-red-100">Total Deducciones</p>
                <p className="text-xl font-bold">{formatCurrency(totalDeducciones)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-orange-100">Este Mes</p>
                <p className="text-xl font-bold">{formatCurrency(totalEsteMes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-700 to-gray-800 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-300">Registros</p>
                <p className="text-xl font-bold">{deducciones.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-500" />
              Nueva Deduccion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Employee Selector - Combobox */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Empleado</Label>
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

            {/* Concepto */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Concepto / Motivo</Label>
              <Input
                placeholder="Ej: Dano de herramienta, Llegada tarde..."
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
              />
            </div>

            {/* Monto */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Monto a Deducir (L)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="pl-10"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Fecha Aplicacion */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Fecha de Aplicacion</Label>
              <Input
                type="date"
                value={fechaAplicacion}
                onChange={(e) => setFechaAplicacion(e.target.value)}
              />
              <p className="text-xs text-gray-500">Periodo de nomina en que se aplicara el descuento</p>
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              disabled={submitting || !selectedEmpleado}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <MinusCircle className="w-4 h-4 mr-2" />
                  Registrar Deduccion
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* History Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" />
              Historial de Deducciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : deducciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <AlertCircle className="w-12 h-12 mb-3" />
                <p className="text-sm">No hay deducciones registradas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Empleado</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Concepto</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monto</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha Aplicacion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deducciones.map((deduccion) => (
                      <tr key={deduccion.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{deduccion.empleado_nombre}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-700">{deduccion.concepto}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm font-semibold text-red-600">
                            -{formatCurrency(deduccion.monto)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {formatDate(deduccion.fecha_aplicacion)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
