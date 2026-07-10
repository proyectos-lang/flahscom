"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { redirect } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CalendarCheck,
  Search,
  MapPin,
  Clock,
  Loader2,
  Wrench,
  Home,
} from "lucide-react"

interface ContratoPendiente {
  id: number
  nombre_completo: string
  telefono: string
  colonia: string
  direccion: string
  nombre_paquete: string
  valor_paquete: number
  fecha_contratacion: string
  latitud: number | null
  longitud: number | null
}

interface FallaPendiente {
  id: number
  contrato_id: number
  nombre_completo: string
  telefono: string
  colonia: string
  direccion: string
  nombre_paquete: string
  valor_paquete: number
  reportado_por: string
  tipo_falla: string
  descripcion_falla: string | null
  fecha_preferencia_cliente: string | null
  created_at: string
  latitud: number | null
  longitud: number | null
}

interface Cuadrilla {
  id: number
  nombre_cuadrilla: string
  lider_nombre: string
  vehiculo_placa: string
  telefono_lider: string
  activa: boolean
}

export default function ProgramacionPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<"instalaciones" | "fallas">("instalaciones")
  const [contratos, setContratos] = useState<ContratoPendiente[]>([])
  const [fallas, setFallas] = useState<FallaPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([])

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ContratoPendiente | FallaPendiente | null>(null)
  const [itemType, setItemType] = useState<"instalacion" | "falla">("instalacion")
  const [cuadrillaId, setCuadrillaId] = useState("")
  const [fechaProgramada, setFechaProgramada] = useState(new Date().toISOString().split("T")[0])
  const [bloqueHorario, setBloqueHorario] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Permission check - must be after all hooks
  useEffect(() => {
    if (!authLoading && (!user || !user.permissions?.programacion)) {
      redirect("/dashboard")
    }
  }, [user, authLoading])

  useEffect(() => {
    if (!authLoading && user?.permissions?.programacion) {
      loadData()
      loadCuadrillas()
    }
  }, [activeTab, authLoading, user])

  const loadData = async () => {
    setLoading(true)
    try {
      const tipo = activeTab === "instalaciones" ? "instalaciones" : "fallas"
      const res = await fetch(`/api/programacion?tipo=${tipo}`)
      const data = await res.json()
      if (data.success) {
        if (activeTab === "instalaciones") {
          setContratos(data.data)
        } else {
          setFallas(data.data)
        }
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadCuadrillas = async () => {
    try {
      const res = await fetch("/api/programacion/cuadrillas")
      const data = await res.json()
      if (data.success) {
        setCuadrillas(data.data)
      }
    } catch (error) {
      console.error("Error loading cuadrillas:", error)
    }
  }

  // Early returns AFTER all hooks and function definitions
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    )
  }

  if (!user || !user.permissions?.programacion) {
    return null
  }

  const openProgramar = (item: ContratoPendiente | FallaPendiente, type: "instalacion" | "falla") => {
    setSelectedItem(item)
    setItemType(type)
    setCuadrillaId("")
    setBloqueHorario("")
    setFechaProgramada(new Date().toISOString().split("T")[0])
    setShowModal(true)
  }

  const handleConfirmar = async () => {
    if (!selectedItem || !cuadrillaId || !fechaProgramada || !bloqueHorario) {
      alert("Completa todos los campos")
      return
    }

    setSubmitting(true)
    try {
      let res
      if (itemType === "instalacion") {
        res = await fetch("/api/programacion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contrato_id: selectedItem.id,
            cuadrilla_id: Number(cuadrillaId),
            fecha_programada: fechaProgramada,
            bloque_horario: bloqueHorario,
          }),
        })
      } else {
        res = await fetch(`/api/fallas/${selectedItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cuadrilla_id: Number(cuadrillaId),
            fecha_programada: fechaProgramada,
            bloque_horario: bloqueHorario,
            estatus_falla: "programada",
          }),
        })
      }

      const data = await res.json()
      if (data.success) {
        alert(itemType === "instalacion" ? "Instalacion programada correctamente" : "Falla programada correctamente")
        setShowModal(false)
        loadData()
      } else {
        alert(data.error || "Error al programar")
      }
    } catch (error) {
      console.error("Error scheduling:", error)
      alert("Error al programar la instalacion")
    } finally {
      setSubmitting(false)
    }
  }

  const openGoogleMaps = (lat: number | null, lng: number | null) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank")
    } else {
      alert("Coordenadas no disponibles")
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A"
    const d = new Date(dateStr + "T00:00:00")
    return d.toLocaleDateString("es-HN", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  const filtered = contratos.filter((c) =>
    c.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toString().includes(search) ||
    c.nombre_paquete.toLowerCase().includes(search.toLowerCase())
  )

  // Contracts with coordinates for the map links
  const contractsWithCoords = filtered.filter((c) => c.latitud && c.longitud)

  if (loading) {
    return (
      <main className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
          <span className="text-sm text-gray-600">Cargando contratos pendientes...</span>
        </div>
      </main>
    )
  }

  return (
    <main className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-orange-500" />
            Dashboard de Programacion
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeTab === "instalaciones" 
              ? <>Contratos aprobados pendientes de instalacion: <span className="font-semibold text-orange-600">{contratos.length}</span></>
              : <>Fallas reportadas pendientes de programar: <span className="font-semibold text-red-600">{fallas.length}</span></>
            }
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Search className="w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nombre, ID o paquete..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-72"
          />
        </div>
      </div>

      {/* Tabs */}
      <Card className="p-2 flex gap-2">
        <Button
          variant={activeTab === "instalaciones" ? "default" : "outline"}
          onClick={() => setActiveTab("instalaciones")}
          className="flex-1 h-10"
        >
          <Home className="w-4 h-4 mr-2" />
          Instalaciones ({contratos.length})
        </Button>
        <Button
          variant={activeTab === "fallas" ? "default" : "outline"}
          onClick={() => setActiveTab("fallas")}
          className="flex-1 h-10"
        >
          <Wrench className="w-4 h-4 mr-2" />
          Fallas ({fallas.length})
        </Button>
      </Card>

      {/* Stats Cards */}
      {activeTab === "instalaciones" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <p className="text-xs text-orange-700">Pendientes</p>
            <p className="text-2xl font-bold text-orange-900">{contratos.length}</p>
          </Card>
          <Card className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <p className="text-xs text-blue-700">Con Ubicacion</p>
            <p className="text-2xl font-bold text-blue-900">{contractsWithCoords.length}</p>
          </Card>
          <Card className="p-3 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <p className="text-xs text-green-700">Cuadrillas</p>
            <p className="text-2xl font-bold text-green-900">{cuadrillas.length}</p>
          </Card>
          <Card className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <p className="text-xs text-purple-700">Resultados</p>
            <p className="text-2xl font-bold text-purple-900">{filtered.length}</p>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <p className="text-xs text-red-700">Fallas Reportadas</p>
            <p className="text-2xl font-bold text-red-900">{fallas.length}</p>
          </Card>
          <Card className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <p className="text-xs text-blue-700">Con Ubicacion</p>
            <p className="text-2xl font-bold text-blue-900">{fallas.filter(f => f.latitud && f.longitud).length}</p>
          </Card>
          <Card className="p-3 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <p className="text-xs text-green-700">Cuadrillas</p>
            <p className="text-2xl font-bold text-green-900">{cuadrillas.length}</p>
          </Card>
          <Card className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <p className="text-xs text-purple-700">Resultados</p>
            <p className="text-2xl font-bold text-purple-900">{fallas.filter(f => 
              f.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
              f.id.toString().includes(search) ||
              f.tipo_falla.toLowerCase().includes(search.toLowerCase())
            ).length}</p>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          {activeTab === "instalaciones" ? (
            <table className="w-full">
              <thead className="bg-gradient-to-r from-orange-50 to-blue-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">ID</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Cliente</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Paquete</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Valor</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Fecha</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Colonia</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Ubicacion</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
                      No se encontraron contratos pendientes
                    </td>
                  </tr>
                ) : (
                  filtered.map((contrato) => (
                    <tr key={contrato.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-2 text-xs font-semibold text-orange-600">#{contrato.id}</td>
                      <td className="px-3 py-2 text-xs text-gray-900">{contrato.nombre_completo}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{contrato.nombre_paquete}</td>
                      <td className="px-3 py-2 text-xs font-medium text-gray-900">L{contrato.valor_paquete.toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{formatDate(contrato.fecha_contratacion)}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{contrato.colonia || <span className="text-gray-400">--</span>}</td>
                      <td className="px-3 py-2 text-center">
                        {contrato.latitud && contrato.longitud ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openGoogleMaps(contrato.latitud, contrato.longitud)}
                            className="h-7 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <MapPin className="w-3 h-3 mr-1" />
                            <span className="text-xs">Ver</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">--</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          size="sm"
                          onClick={() => openProgramar(contrato, "instalacion")}
                          className="h-7 px-3 text-xs bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                        >
                          <CalendarCheck className="w-3 h-3 mr-1" />
                          Programar
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-gradient-to-r from-red-50 to-orange-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">ID Falla</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Contrato</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Cliente</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Tipo Falla</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Descripcion</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Reportado Por</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Reportada</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Fecha Preferencia</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Colonia</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Ubicacion</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fallas.filter(f => 
                  f.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
                  f.id.toString().includes(search) ||
                  f.tipo_falla.toLowerCase().includes(search.toLowerCase())
                ).length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-sm text-gray-500">
                      No se encontraron fallas reportadas
                    </td>
                  </tr>
                ) : (
                  fallas.filter(f => 
                    f.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
                    f.id.toString().includes(search) ||
                    f.tipo_falla.toLowerCase().includes(search.toLowerCase())
                  ).map((falla) => (
                    <tr key={falla.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-2 text-xs font-semibold text-red-600">#{falla.id}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-blue-600">#{falla.contrato_id}</td>
                      <td className="px-3 py-2 text-xs text-gray-900">{falla.nombre_completo}</td>
                      <td className="px-3 py-2 text-xs">
                        <Badge variant="outline" className="text-xs">{falla.tipo_falla}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700 max-w-xs truncate">
                        {falla.descripcion_falla || "Sin descripcion"}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">{falla.reportado_por || <span className="text-gray-400">--</span>}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{formatDate(falla.created_at.split("T")[0])}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {falla.fecha_preferencia_cliente ? formatDate(falla.fecha_preferencia_cliente) : <span className="text-gray-400">--</span>}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">{falla.colonia || <span className="text-gray-400">--</span>}</td>
                      <td className="px-3 py-2 text-center">
                        {falla.latitud && falla.longitud ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openGoogleMaps(falla.latitud, falla.longitud)}
                            className="h-7 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <MapPin className="w-3 h-3 mr-1" />
                            <span className="text-xs">Ver</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">--</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          size="sm"
                          onClick={() => openProgramar(falla, "falla")}
                          className="h-7 px-3 text-xs bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                        >
                          <CalendarCheck className="w-3 h-3 mr-1" />
                          Programar
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Programar Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Programar Instalacion</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 mb-4">
              <p className="text-xs font-semibold text-orange-700 mb-2">{itemType === "instalacion" ? "Cliente a Programar:" : "Falla a Programar:"}</p>
              <p className="text-xs text-gray-600">{itemType === "instalacion" ? "Contrato" : "Falla"} <span className="font-semibold text-orange-600">#{selectedItem.id}</span></p>
              <p className="text-sm font-medium text-gray-900">{selectedItem.nombre_completo}</p>
              <p className="text-xs text-gray-600">{selectedItem.nombre_paquete} - L{selectedItem.valor_paquete.toFixed(2)}</p>
            </div>
          )}

          {/* Cuadrilla Select */}
          <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Cuadrilla</label>
                <Select value={cuadrillaId} onValueChange={setCuadrillaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuadrilla..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cuadrillas.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nombre_cuadrilla} - {c.lider_nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Fecha Programada</label>
                <Input
                  type="date"
                  value={fechaProgramada}
                  onChange={(e) => setFechaProgramada(e.target.value)}
                />
              </div>

              {/* Bloque Horario */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Bloque Horario</label>
                <Select value={bloqueHorario} onValueChange={setBloqueHorario}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar horario..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manana">
                      <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Manana (8:00 - 12:00)</span>
                    </SelectItem>
                    <SelectItem value="tarde">
                      <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Tarde (12:00 - 16:00)</span>
                    </SelectItem>
                    <SelectItem value="noche">
                      <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Noche (16:00 - 20:00)</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowModal(false)} disabled={submitting}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmar}
                  disabled={submitting || !cuadrillaId || !fechaProgramada || !bloqueHorario}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Programando...
                    </>
                  ) : (
                    "Confirmar Programacion"
                  )}
                </Button>
              </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
