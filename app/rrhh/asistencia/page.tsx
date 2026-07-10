"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { exportToExcel } from "@/lib/export-excel"
import { 
  Clock, 
  UserCheck, 
  UserX, 
  Loader2,
  Search,
  RefreshCw,
  LogIn,
  Users,
  Building2,
  FileSpreadsheet,
  Calendar,
  Download
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Empleado {
  id: number
  identificacion: string
  nombre_completo: string
  empresa: string
}

interface Asistencia {
  id: number
  empleado_id: number
  fecha: string
  hora_entrada: string | null
  tipo: string
}

interface AsistenciaHistorico {
  id: number
  fecha: string
  hora_entrada: string | null
  hora_salida: string | null
  tipo: string
  empleados: {
    nombre_completo: string
    identificacion: string
    empresa: string
  }
}

// Helper function to get local date in YYYY-MM-DD format (Honduras CST)
function getLocalDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Helper function to get local time in HH:mm:ss format (Honduras CST)
function getLocalTime(): string {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, "0")
  const minutes = String(now.getMinutes()).padStart(2, "0")
  const seconds = String(now.getSeconds()).padStart(2, "0")
  return `${hours}:${minutes}:${seconds}`
}

// Helper to format time for display
function formatTime(time: string | null): string {
  if (!time) return "-"
  const [h, m] = time.split(":")
  const hour = parseInt(h)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

export default function AsistenciaPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [asistencias, setAsistencias] = useState<Asistencia[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [search, setSearch] = useState("")
  const [identificacion, setIdentificacion] = useState("")
  const [currentTime, setCurrentTime] = useState(getLocalTime())
  const { toast } = useToast()

  const fechaHoy = getLocalDate()

  // Reporte Historico state
  const [activeTab, setActiveTab] = useState("checador")
  const [fechaInicio, setFechaInicio] = useState(getLocalDate())
  const [fechaFin, setFechaFin] = useState(getLocalDate())
  const [historicoData, setHistoricoData] = useState<AsistenciaHistorico[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [searchHistorico, setSearchHistorico] = useState("")

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getLocalTime())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/rrhh/asistencia?fecha=${fechaHoy}`)
      const data = await res.json()
      
      if (data.success) {
        setEmpleados(data.empleados || [])
        setAsistencias(data.asistencias || [])
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [fechaHoy, toast])

  useEffect(() => {
    loadData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [loadData])

  const marcarEntrada = async () => {
    if (!identificacion.trim()) {
      toast({
        title: "Error",
        description: "Ingrese su identificacion",
        variant: "destructive",
      })
      return
    }

    setMarking(true)
    try {
      const horaEntrada = getLocalTime()
      
      const res = await fetch("/api/rrhh/asistencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identificacion: identificacion.trim(),
          fecha: fechaHoy,
          hora_entrada: horaEntrada,
          tipo: "asistencia",
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        toast({
          title: "Error",
          description: data.error || "Empleado no encontrado",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Entrada Registrada",
        description: `Entrada registrada para ${data.empleado.nombre_completo} a las ${formatTime(horaEntrada)}`,
      })
      
      setIdentificacion("")
      loadData()
    } catch (error) {
      console.error("Error marking entrada:", error)
      toast({
        title: "Error",
        description: "No se pudo registrar la entrada",
        variant: "destructive",
      })
    } finally {
      setMarking(false)
    }
  }

  // Handle Enter key in input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !marking) {
      marcarEntrada()
    }
  }

  // Get attendance status for an employee
  const getAsistencia = (empleadoId: number): Asistencia | undefined => {
    return asistencias.find(a => a.empleado_id === empleadoId)
  }

  // Filter employees by search
  const filteredEmpleados = empleados.filter(emp =>
    emp.nombre_completo?.toLowerCase().includes(search.toLowerCase()) ||
    emp.identificacion?.toLowerCase().includes(search.toLowerCase()) ||
    emp.empresa?.toLowerCase().includes(search.toLowerCase())
  )

  // Stats
  const stats = {
    total: empleados.length,
    presentes: asistencias.filter(a => a.tipo === "asistencia").length,
    ausentes: empleados.length - asistencias.length,
  }

  // Load historico data
  const loadHistorico = async () => {
    if (!fechaInicio || !fechaFin) {
      toast({
        title: "Error",
        description: "Seleccione las fechas de inicio y fin",
        variant: "destructive",
      })
      return
    }

    setLoadingHistorico(true)
    try {
      const res = await fetch(`/api/rrhh/asistencia/historico?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`)
      const data = await res.json()
      
      if (data.success) {
        setHistoricoData(data.data || [])
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("Error loading historico:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el historico",
        variant: "destructive",
      })
    } finally {
      setLoadingHistorico(false)
    }
  }

  // Filter historico by search
  const filteredHistorico = historicoData.filter(item =>
    item.empleados?.nombre_completo?.toLowerCase().includes(searchHistorico.toLowerCase()) ||
    item.empleados?.identificacion?.toLowerCase().includes(searchHistorico.toLowerCase()) ||
    item.empleados?.empresa?.toLowerCase().includes(searchHistorico.toLowerCase())
  )

  // Export to Excel/CSV
  const exportToExcel = () => {
    if (filteredHistorico.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay datos para exportar",
        variant: "destructive",
      })
      return
    }

    const headers = ["Empleado", "Identificacion", "Empresa", "Fecha", "Hora Entrada", "Hora Salida", "Tipo"]
    const rows = filteredHistorico.map(item => [
      item.empleados?.nombre_completo || "",
      item.empleados?.identificacion || "",
      item.empleados?.empresa || "",
      item.fecha,
      item.hora_entrada || "",
      item.hora_salida || "",
      item.tipo || ""
    ])

    exportToExcel({
      filename: `reporte_asistencias_${fechaInicio}_${fechaFin}`,
      sheetName: "Asistencias",
      headers,
      rows,
    })

    toast({
      title: "Exportado",
      description: "El reporte se descargo correctamente",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control de Asistencia</h1>
          <p className="text-sm text-gray-500 mt-1">Reloj checador y reportes historicos</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="checador" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Reloj Checador
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Reporte Historico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checador" className="space-y-6 mt-6">
          {/* Refresh Button */}
          <div className="flex justify-end">
            <Button onClick={loadData} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>

          {/* Time Clock Card */}
      <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Marcar Entrada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Time Display */}
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Hora Actual (Honduras)</p>
            <p className="text-4xl font-mono font-bold text-orange-600">{formatTime(currentTime)}</p>
            <p className="text-sm text-gray-500 mt-1">{new Date().toLocaleDateString("es-HN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>

          {/* Identification Input */}
          <div className="max-w-md mx-auto space-y-3">
            <Input
              type="text"
              placeholder="Ingrese su Identificacion"
              value={identificacion}
              onChange={(e) => setIdentificacion(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-center text-lg h-14 font-medium border-2 focus:border-orange-400"
              disabled={marking}
            />
            <Button 
              onClick={marcarEntrada}
              disabled={marking || !identificacion.trim()}
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-lg font-semibold"
            >
              {marking ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5 mr-2" />
              )}
              Marcar Entrada
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Headcount Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-green-600 uppercase">Presentes</p>
                <p className="text-2xl font-bold text-green-700">{stats.presentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <UserX className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-orange-600 uppercase">No han llegado</p>
                <p className="text-2xl font-bold text-orange-700">{stats.ausentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Headcount Monitor Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-500" />
              Monitor de Asistencia del Dia
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar empleado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
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
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Identificacion</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Nombre Completo</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Empresa</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Estatus</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Hora de Entrada</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmpleados.map((emp) => {
                    const asistencia = getAsistencia(emp.id)
                    const llegó = !!asistencia

                    return (
                      <tr key={emp.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-gray-600">{emp.identificacion || "-"}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              llegó ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                            }`}>
                              {emp.nombre_completo?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <span className="font-medium text-gray-900">{emp.nombre_completo}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={
                            emp.empresa === "FLASHCOM" ? "border-orange-300 text-orange-700" : "border-blue-300 text-blue-700"
                          }>
                            {emp.empresa}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {llegó ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Llego
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                              <UserX className="w-3 h-3 mr-1" />
                              No ha llegado
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          {llegó ? (
                            <span className="text-green-600 font-medium">{formatTime(asistencia.hora_entrada)}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
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

        {/* Reporte Historico Tab */}
        <TabsContent value="historico" className="space-y-6 mt-6">
          {/* Filters Card */}
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-600" />
                Filtrar por Rango de Fechas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600">Fecha Inicio</label>
                  <Input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-44"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600">Fecha Fin</label>
                  <Input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-44"
                  />
                </div>
                <Button 
                  onClick={loadHistorico}
                  disabled={loadingHistorico}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loadingHistorico ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Buscar
                </Button>
                <Button 
                  onClick={exportToExcel}
                  disabled={filteredHistorico.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar a Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  Resultados ({filteredHistorico.length} registros)
                </CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar en resultados..."
                    value={searchHistorico}
                    onChange={(e) => setSearchHistorico(e.target.value)}
                    className="pl-9 h-8 text-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingHistorico ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                </div>
              ) : historicoData.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Seleccione un rango de fechas y haga clic en Buscar</p>
                </div>
              ) : filteredHistorico.length === 0 ? (
                <p className="text-center text-gray-400 py-12">No se encontraron resultados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Empleado</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Identificacion</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Empresa</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Fecha</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Hora Entrada</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Hora Salida</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistorico.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-medium text-gray-900">{item.empleados?.nombre_completo || "-"}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-gray-600">{item.empleados?.identificacion || "-"}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className={
                              item.empleados?.empresa === "FLASHCOM" ? "border-orange-300 text-orange-700" : "border-blue-300 text-blue-700"
                            }>
                              {item.empleados?.empresa || "-"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-gray-700">{item.fecha}</td>
                          <td className="py-3 px-4 text-center font-mono text-green-600">
                            {item.hora_entrada ? formatTime(item.hora_entrada) : "-"}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-blue-600">
                            {item.hora_salida ? formatTime(item.hora_salida) : "-"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={
                              item.tipo === "asistencia" 
                                ? "bg-green-100 text-green-700" 
                                : item.tipo === "permiso"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                            }>
                              {item.tipo || "-"}
                            </Badge>
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
