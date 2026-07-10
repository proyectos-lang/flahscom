"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { exportToExcel } from "@/lib/export-excel"
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  FileSignature, 
  ChevronLeft, 
  ChevronRight,
  WrenchIcon,
  WifiOff,
  Eye,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  BarChart3,
  TrendingUp,
  Users,
  Timer,
  Activity,
  Check,
  CalendarDays,
  RotateCcw,
  AlertTriangle,
  Download,
  ShieldAlert,
  History,
} from "lucide-react"

interface Instalacion {
  id: number
  contrato_id: number
  cuadrilla_id: number | null
  estatus_instalacion: string
  fecha_programada: string
  bloque_horario: string | null
  fecha_real_instalacion: string | null
  hora_inicio: string | null
  hora_fin: string | null
  serie_ont_router: string | null
  serie_antena_receptor: string | null
  url_foto_potencia_caset: string | null
  url_foto_pi_fibra: string | null
  url_foto_pf_fibra: string | null
  url_foto_numeracion_nap: string | null
  url_foto_etiqueta_cliente_nap: string | null
  url_foto_potencia_liuk: string | null
  url_foto_serie_equipo: string | null
  url_foto_potencia_interna: string | null
  url_foto_contrasena: string | null
  url_foto_test_velocidad: string | null
  url_foto_estetico_equipos: string | null
  url_foto_tv_pantalla: string | null
  url_firma_cliente: string | null
  observaciones_tecnicas: string | null
  paquete: string | null
  created_at: string
  contratos: {
    id: number
    cliente_id: number
    paquete_id: number | null
    nombre_paquete: string | null
    valor_paquete: number | null
    clientes: {
      id: number
      nombre_completo: string
      numero_identidad: string | null
      telefono: string | null
      direccion: string | null
    } | null
  }
  cuadrillas: {
    id: number
    nombre_cuadrilla: string
    lider_nombre: string
  } | null
}

interface Falla {
  id: number
  contrato_id: number | null
  cuadrilla_id: number | null
  reportado_por: string | null
  telefono_contacto_adicional: string | null
  tipo_falla: string | null
  descripcion_falla: string | null
  estatus_falla: string
  fecha_programada: string | null
  bloque_horario: string | null
  fecha_preferencia_cliente: string | null
  fecha_real_resolucion: string | null
  hora_inicio: string | null
  hora_fin: string | null
  observaciones_tecnico: string | null
  urls_evidencias: string[]
  url_firma_cliente: string | null
  created_at: string
  contratos: {
    id: number
    cliente_id: number
    nombre_paquete: string | null
    clientes: {
      id: number
      nombre_completo: string
      telefono: string | null
      direccion: string | null
    } | null
  } | null
  cuadrillas: {
    id: number
    nombre_cuadrilla: string
    lider_nombre: string
  } | null
}

interface CuadrillaOption {
  id: number
  nombre_cuadrilla: string
}

interface PaqueteOption {
  id: number
  nombre: string
}

const ESTATUS_OPTIONS = [
  { value: "", label: "Todos los estatus" },
  { value: "programada", label: "Programada" },
  { value: "en_ruta", label: "En Ruta" },
  { value: "en_proceso", label: "En Proceso" },
  { value: "instalado", label: "Instalado" },
  { value: "fallido", label: "Fallido" },
]

const ESTATUS_FALLA_OPTIONS = [
  { value: "", label: "Todos los estatus" },
  { value: "reportada", label: "Reportada" },
  { value: "programada", label: "Programada" },
  { value: "en_proceso", label: "En Proceso" },
  { value: "resuelta", label: "Resuelta" },
  { value: "fallida", label: "Fallida" },
]

function getEstatusFallaBadge(estatus: string) {
  switch (estatus) {
    case "reportada":
      return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Reportada</Badge>
    case "programada":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Programada</Badge>
    case "en_proceso":
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">En Proceso</Badge>
    case "resuelta":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Resuelta</Badge>
    case "fallida":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Fallida</Badge>
    default:
      return <Badge variant="outline">{estatus}</Badge>
  }
}

function getEstatusBadge(estatus: string) {
  switch (estatus) {
    case "programada":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Programada</Badge>
    case "en_ruta":
      return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">En Ruta</Badge>
    case "en_proceso":
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">En Proceso</Badge>
    case "instalado":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Instalado</Badge>
    case "fallido":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Fallido</Badge>
    default:
      return <Badge variant="outline">{estatus}</Badge>
  }
}

function formatDate(date: string | null) {
  if (!date) return "-"
  const [year, month, day] = date.split("T")[0].split("-")
  return `${day}/${month}/${year}`
}

function formatTime(time: string | null) {
  if (!time) return "-"
  const parts = time.split(":")
  return `${parts[0]}:${parts[1]}`
}

function calcDuration(inicio: string | null, fin: string | null): string {
  if (!inicio || !fin) return "-"
  const [hI, mI, sI] = inicio.split(":").map(Number)
  const [hF, mF, sF] = fin.split(":").map(Number)
  const totalMin = (hF * 60 + mF) - (hI * 60 + mI)
  if (totalMin < 0) return "-"
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

export default function HistorialInstalacionesPage() {
  // Tab
  const [activeTab, setActiveTab] = useState<"instalaciones" | "fallas" | "seguimiento" | "dashboard">("instalaciones")

  // Seguimiento de Fallos state: all resolved fallas grouped by contract
  const [seguimientoData, setSeguimientoData] = useState<Falla[]>([])
  const [seguimientoLoading, setSeguimientoLoading] = useState(false)
  const [seguimientoCuadrilla, setSeguimientoCuadrilla] = useState<string>("")
  const [seguimientoFechaDesde, setSeguimientoFechaDesde] = useState<string>("")
  const [seguimientoFechaHasta, setSeguimientoFechaHasta] = useState<string>("")
  const [selectedContratoTimeline, setSelectedContratoTimeline] = useState<number | null>(null)

  // Dashboard state
  const [dashboardMes, setDashboardMes] = useState(() => new Date().toISOString().slice(0, 7))
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardData, setDashboardData] = useState<{
    mes: string
    resumen: {
      totalInstalaciones: number
      instaladas: number
      fallidas: number
      pendientes: number
      tasaExito: number
      promedioDuracionMinutos: number
    }
    porDia: Array<{ fecha: string; total: number; instaladas: number; fallidas: number; pendientes: number }>
    porCuadrilla: Array<{
      id: number
      nombre: string
      lider: string
      total: number
      instaladas: number
      fallidas: number
      pendientes: number
      promedioDuracion: number
    }>
    actividadReciente: Array<{
      tipo: "nueva" | "finalizada" | "fallida" | "en_proceso"
      instalacion_id: number
      contrato_id: number
      cliente: string
      cuadrilla: string
      fecha: string
      hora: string
    }>
    ordenesReiterativas?: Array<{ tipo: string; total: number }>
    fallasPorDia?: Array<{ fecha: string; total: number }>
  } | null>(null)

  // Instalaciones state
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [estatus, setEstatus] = useState("")
  const [cuadrillaId, setCuadrillaId] = useState("")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [cuadrillas, setCuadrillas] = useState<CuadrillaOption[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Package catalog for the editable "Paquete" Select in the detail modal
  const [paquetes, setPaquetes] = useState<PaqueteOption[]>([])
  const [savingPaquete, setSavingPaquete] = useState(false)

  const { toast } = useToast()

  // Detail modal
  const [selectedInstalacion, setSelectedInstalacion] = useState<Instalacion | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  // Image viewer
  const [viewImage, setViewImage] = useState<string | null>(null)

  // Photos modal - dedicated for viewing all 12 photos
  const [showPhotosModal, setShowPhotosModal] = useState(false)
  const [photosInstalacion, setPhotosInstalacion] = useState<Instalacion | null>(null)

  // Inline date editing (instalaciones)
  const [editingFechaId, setEditingFechaId] = useState<number | null>(null)
  const [editingFechaValue, setEditingFechaValue] = useState<string>("")
  const [savingFecha, setSavingFecha] = useState(false)

  // Fallas state
  const [fallas, setFallas] = useState<Falla[]>([])
  const [fallasLoading, setFallasLoading] = useState(false)
  const [fallasSearch, setFallasSearch] = useState("")
  const [fallasEstatus, setFallasEstatus] = useState("")
  const [fallasCuadrillaId, setFallasCuadrillaId] = useState("")
  const [fallasFechaDesde, setFallasFechaDesde] = useState("")
  const [fallasFechaHasta, setFallasFechaHasta] = useState("")
  const [fallasPage, setFallasPage] = useState(1)
  const [fallasTotalPages, setFallasTotalPages] = useState(1)
  const [fallasTotal, setFallasTotal] = useState(0)
  const [fallasShowFilters, setFallasShowFilters] = useState(false)

  // Inline date editing (fallas)
  const [editingFallaFechaId, setEditingFallaFechaId] = useState<number | null>(null)
  const [editingFallaFechaValue, setEditingFallaFechaValue] = useState<string>("")
  const [savingFallaFecha, setSavingFallaFecha] = useState(false)

  // Reactivate
  const [reactivating, setReactivating] = useState<number | null>(null)

  // Reassign cuadrilla
  const [reassignTarget, setReassignTarget] = useState<{ id: number; tipo: "instalacion" | "falla" } | null>(null)
  const [reassignCuadrillaId, setReassignCuadrillaId] = useState("")
  const [reassigning, setReassigning] = useState(false)

  const openReassign = (id: number, tipo: "instalacion" | "falla") => {
    setReassignTarget({ id, tipo })
    setReassignCuadrillaId("")
  }

  const handleReassign = async () => {
    if (!reassignTarget || !reassignCuadrillaId) return
    setReassigning(true)
    try {
      const res = await fetch(`/api/tecnico/${reassignTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: reassignTarget.tipo, cuadrilla_id: Number(reassignCuadrillaId) }),
      })
      if (res.ok) {
        const matched = cuadrillas.find((c) => String(c.id) === reassignCuadrillaId)
        if (reassignTarget.tipo === "instalacion") {
          setInstalaciones((prev) =>
            prev.map((i) => i.id === reassignTarget.id
              ? { ...i, cuadrilla_id: Number(reassignCuadrillaId), cuadrillas: matched ? { id: matched.id, nombre_cuadrilla: matched.nombre_cuadrilla, lider_nombre: "" } : i.cuadrillas }
              : i
            )
          )
        } else {
          setFallas((prev) =>
            prev.map((f) => f.id === reassignTarget.id
              ? { ...f, cuadrilla_id: Number(reassignCuadrillaId), cuadrillas: matched ? { id: matched.id, nombre_cuadrilla: matched.nombre_cuadrilla, lider_nombre: "" } : f.cuadrillas }
              : f
            )
          )
        }
        setReassignTarget(null)
      }
    } catch (e) {
      console.error("Error reassigning cuadrilla:", e)
    } finally {
      setReassigning(false)
    }
  }

  const handleReactivate = async (id: number, tipo: "instalacion" | "falla") => {
    setReactivating(id)
    try {
      const body = tipo === "instalacion"
        ? { tipo, estatus_instalacion: "programada" }
        : { tipo, estatus_falla: "programada" }
      const res = await fetch(`/api/tecnico/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        if (tipo === "instalacion") {
          setInstalaciones((prev) =>
            prev.map((i) => i.id === id ? { ...i, estatus_instalacion: "programada" } : i)
          )
        } else {
          setFallas((prev) =>
            prev.map((f) => f.id === id ? { ...f, estatus_falla: "programada" } : f)
          )
        }
      }
    } catch (e) {
      console.error("Error reactivating:", e)
    } finally {
      setReactivating(null)
    }
  }

  const startEditFecha = (inst: Instalacion) => {
    setEditingFechaId(inst.id)
    setEditingFechaValue(inst.fecha_programada || "")
  }

  const cancelEditFecha = () => {
    setEditingFechaId(null)
    setEditingFechaValue("")
  }

  const saveFecha = async (instId: number) => {
    if (!editingFechaValue) return
    setSavingFecha(true)
    try {
      const res = await fetch(`/api/tecnico/${instId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "instalacion", fecha_programada: editingFechaValue }),
      })
      const data = await res.json()
      if (data.success || res.ok) {
        setInstalaciones((prev) =>
          prev.map((i) => i.id === instId ? { ...i, fecha_programada: editingFechaValue } : i)
        )
        setEditingFechaId(null)
      }
    } catch (e) {
      console.error("Error saving fecha:", e)
    } finally {
      setSavingFecha(false)
    }
  }

  const startEditFallaFecha = (falla: Falla) => {
    setEditingFallaFechaId(falla.id)
    setEditingFallaFechaValue(falla.fecha_programada || "")
  }

  const cancelEditFallaFecha = () => {
    setEditingFallaFechaId(null)
    setEditingFallaFechaValue("")
  }

  const saveFallaFecha = async (fallaId: number) => {
    if (!editingFallaFechaValue) return
    setSavingFallaFecha(true)
    try {
      const res = await fetch(`/api/tecnico/${fallaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "falla", fecha_programada: editingFallaFechaValue }),
      })
      if (res.ok) {
        setFallas((prev) =>
          prev.map((f) => f.id === fallaId ? { ...f, fecha_programada: editingFallaFechaValue } : f)
        )
        setEditingFallaFechaId(null)
      }
    } catch (e) {
      console.error("Error saving falla fecha:", e)
    } finally {
      setSavingFallaFecha(false)
    }
  }

  const loadFallas = useCallback(async () => {
    setFallasLoading(true)
    try {
      const params = new URLSearchParams()
      if (fallasSearch) params.set("search", fallasSearch)
      if (fallasEstatus) params.set("estatus", fallasEstatus)
      if (fallasCuadrillaId) params.set("cuadrilla_id", fallasCuadrillaId)
      if (fallasFechaDesde) params.set("fecha_desde", fallasFechaDesde)
      if (fallasFechaHasta) params.set("fecha_hasta", fallasFechaHasta)
      params.set("page", String(fallasPage))
      const res = await fetch(`/api/historial-fallas?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setFallas(data.data)
        setFallasTotalPages(data.totalPages)
        setFallasTotal(data.total)
      }
    } catch (e) {
      console.error("Error loading fallas:", e)
    } finally {
      setFallasLoading(false)
    }
  }, [fallasSearch, fallasEstatus, fallasCuadrillaId, fallasFechaDesde, fallasFechaHasta, fallasPage])

  useEffect(() => {
    loadCuadrillas()
    loadPaquetes()
  }, [])

  const loadCuadrillas = async () => {
    try {
      const res = await fetch("/api/programacion/cuadrillas")
      const data = await res.json()
      if (data.success) setCuadrillas(data.data)
    } catch (e) {
      /* ignore */
    }
  }

  const loadPaquetes = async () => {
    try {
      const res = await fetch("/api/packages")
      const data = await res.json()
      if (data.packages) setPaquetes(data.packages)
    } catch (e) {
      /* ignore */
    }
  }

  // Updates the package on the installation AND the master contract in
  // parallel, without ever recalculating the client's monthly price.
  const handleUpdatePaquete = async (inst: Instalacion, nuevoPaquete: string) => {
    const actual = inst.contratos?.nombre_paquete || inst.paquete || ""
    if (!nuevoPaquete || nuevoPaquete === actual) return

    setSavingPaquete(true)
    try {
      const res = await fetch("/api/historial-instalaciones/paquete", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instalacion_id: inst.id,
          contrato_id: inst.contrato_id,
          paquete: nuevoPaquete,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo actualizar el paquete")
      }

      // Sync local state so both the table/CSV and the open modal reflect the
      // new package immediately (price fields are left untouched).
      setInstalaciones((prev) =>
        prev.map((i) =>
          i.id === inst.id
            ? {
                ...i,
                paquete: nuevoPaquete,
                contratos: { ...i.contratos, nombre_paquete: nuevoPaquete },
              }
            : i,
        ),
      )
      setSelectedInstalacion((prev) =>
        prev && prev.id === inst.id
          ? { ...prev, paquete: nuevoPaquete, contratos: { ...prev.contratos, nombre_paquete: nuevoPaquete } }
          : prev,
      )

      toast({
        title: "Paquete actualizado",
        description: "Paquete actualizado exitosamente en el historial y en el contrato maestro.",
      })
    } catch (e: any) {
      console.error("Error updating paquete:", e)
      toast({
        title: "Error",
        description: e.message || "Error al actualizar el paquete",
        variant: "destructive",
      })
    } finally {
      setSavingPaquete(false)
    }
  }

  const loadInstalaciones = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (estatus) params.set("estatus", estatus)
      if (cuadrillaId) params.set("cuadrilla_id", cuadrillaId)
      if (fechaDesde) params.set("fecha_desde", fechaDesde)
      if (fechaHasta) params.set("fecha_hasta", fechaHasta)
      params.set("page", String(page))

      const res = await fetch(`/api/historial-instalaciones?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setInstalaciones(data.data)
        setTotalPages(data.totalPages)
        setTotal(data.total)
      }
    } catch (e) {
      console.error("Error loading historial:", e)
    } finally {
      setLoading(false)
    }
  }, [search, estatus, cuadrillaId, fechaDesde, fechaHasta, page])

  useEffect(() => {
    loadInstalaciones()
  }, [loadInstalaciones])

  useEffect(() => {
    if (activeTab === "fallas") loadFallas()
  }, [activeTab, loadFallas])

  // Dashboard loader
  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true)
    try {
      const res = await fetch(`/api/historial-instalaciones/dashboard?mes=${dashboardMes}`)
      const data = await res.json()
      if (data.success) {
        setDashboardData(data)
      }
    } catch (e) {
      console.error("Error loading dashboard:", e)
    } finally {
      setDashboardLoading(false)
    }
  }, [dashboardMes])

  useEffect(() => {
    if (activeTab === "dashboard") loadDashboard()
  }, [activeTab, loadDashboard])

  // Seguimiento loader: fetches all resolved fallas (across pages) so we can
  // group by contract on the client and detect reincidencias.
  const loadSeguimiento = useCallback(async () => {
    setSeguimientoLoading(true)
    try {
      const params = new URLSearchParams()
      if (seguimientoCuadrilla) params.set("cuadrilla_id", seguimientoCuadrilla)
      if (seguimientoFechaDesde) params.set("fecha_desde", seguimientoFechaDesde)
      if (seguimientoFechaHasta) params.set("fecha_hasta", seguimientoFechaHasta)
      const res = await fetch(`/api/historial-fallas/seguimiento?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setSeguimientoData(data.data || [])
      }
    } catch (e) {
      console.error("Error loading seguimiento:", e)
    } finally {
      setSeguimientoLoading(false)
    }
  }, [seguimientoCuadrilla, seguimientoFechaDesde, seguimientoFechaHasta])

  useEffect(() => {
    if (activeTab === "seguimiento") loadSeguimiento()
  }, [activeTab, loadSeguimiento])

  // Client-side filter by name (nested join can't be filtered in Supabase query)
  const filteredInstalaciones = instalaciones.filter((inst) => {
    if (!search || !isNaN(Number(search))) return true // number search handled by API
    const clientName = inst.contratos?.clientes?.nombre_completo?.toLowerCase() || ""
    return clientName.includes(search.toLowerCase())
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadInstalaciones()
  }

  const clearFilters = () => {
    setSearch("")
    setEstatus("")
    setCuadrillaId("")
    setFechaDesde("")
    setFechaHasta("")
    setPage(1)
  }

  // Downloads a real .xlsx workbook (each value in its own column). Any legacy
  // .csv extension passed by callers is stripped; exportToExcel appends .xlsx.
  const downloadCsv = (headers: string[], rows: (string | number)[][], filename: string) => {
    const base = filename.replace(/\.(csv|xlsx)$/i, "")
    exportToExcel({ filename: base, sheetName: "Datos", headers, rows })
  }

  const exportInstalacionesExcel = () => {
    if (!filteredInstalaciones || filteredInstalaciones.length === 0) return
    const headers = [
      "ID",
      "Cliente",
      "Cuadrilla",
      "Fecha Programada",
      "Bloque Horario",
      "Estado",
      "Fecha Real",
      "Hora Inicio",
      "Hora Fin",
      "Duracion",
      "Paquete",
    ]
    const rows = filteredInstalaciones.map((inst) => [
      inst.id,
      inst.contratos?.clientes?.nombre_completo || "-",
      inst.cuadrillas?.nombre_cuadrilla || "-",
      formatDate(inst.fecha_programada),
      inst.bloque_horario || "-",
      inst.estatus_instalacion || "-",
      formatDate(inst.fecha_real_instalacion),
      formatTime(inst.hora_inicio),
      formatTime(inst.hora_fin),
      calcDuration(inst.hora_inicio, inst.hora_fin),
      inst.contratos?.nombre_paquete || "-",
    ])
    const today = new Date().toISOString().slice(0, 10)
    downloadCsv(headers, rows, `instalaciones_${today}.csv`)
  }

  const exportFallasExcel = () => {
    if (!fallas || fallas.length === 0) return
    const headers = [
      "ID",
      "Cliente",
      "Cuadrilla",
      "Fecha Programada",
      "Bloque Horario",
      "Tipo Falla",
      "Estado",
      "Fecha Resolucion",
      "Hora Inicio",
      "Hora Fin",
      "Duracion",
    ]
    const rows = fallas.map((falla) => [
      falla.id,
      falla.contratos?.clientes?.nombre_completo || falla.reportado_por || "-",
      falla.cuadrillas?.nombre_cuadrilla || "-",
      formatDate(falla.fecha_programada),
      falla.bloque_horario || "-",
      falla.tipo_falla || "-",
      falla.estatus_falla || "-",
      formatDate(falla.fecha_real_resolucion),
      formatTime(falla.hora_inicio),
      formatTime(falla.hora_fin),
      calcDuration(falla.hora_inicio, falla.hora_fin),
    ])
    const today = new Date().toISOString().slice(0, 10)
    downloadCsv(headers, rows, `fallas_${today}.csv`)
  }

  const openDetail = (inst: Instalacion) => {
    setSelectedInstalacion(inst)
    setShowDetail(true)
  }

  const openPhotosModal = (inst: Instalacion) => {
    setPhotosInstalacion(inst)
    setShowPhotosModal(true)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-blue-50/30 p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial de Instalaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeTab === "instalaciones"
              ? `${total} instalaciones encontradas`
              : activeTab === "fallas"
              ? `${fallasTotal} fallas encontradas`
              : activeTab === "seguimiento"
              ? `${seguimientoData.length} fallas resueltas analizadas`
              : "Resumen mensual"}
          </p>
        </div>
        <div className="flex gap-2 w-fit">
          {(activeTab === "instalaciones" || activeTab === "fallas") && (
            <Button
              size="sm"
              onClick={activeTab === "instalaciones" ? exportInstalacionesExcel : exportFallasExcel}
              disabled={
                activeTab === "instalaciones"
                  ? filteredInstalaciones.length === 0
                  : fallas.length === 0
              }
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          )}
          {(activeTab === "instalaciones" || activeTab === "fallas") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => activeTab === "instalaciones" ? setShowFilters(!showFilters) : setFallasShowFilters(!fallasShowFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {(activeTab === "instalaciones" ? showFilters : fallasShowFilters) ? "Ocultar Filtros" : "Mostrar Filtros"}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("instalaciones")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "instalaciones"
              ? "bg-white text-orange-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <WrenchIcon className="w-4 h-4" />
          Instalaciones
        </button>
        <button
          onClick={() => setActiveTab("fallas")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "fallas"
              ? "bg-white text-red-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <WifiOff className="w-4 h-4" />
          Fallas
        </button>
        <button
          onClick={() => setActiveTab("seguimiento")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "seguimiento"
              ? "bg-white text-amber-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Seguimiento de Fallos
        </button>
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "dashboard"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Dashboard
        </button>
      </div>

      {/* =================== INSTALACIONES TAB =================== */}
      {activeTab === "instalaciones" && <>
      {/* Search and Filters */}
      <Card className="p-4 space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre de cliente o # contrato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white">
            Buscar
          </Button>
        </form>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Estatus</label>
              <Select value={estatus} onValueChange={(v) => { setEstatus(v); setPage(1) }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos los estatus" />
                </SelectTrigger>
                <SelectContent>
                  {ESTATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value || "all"}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Cuadrilla</label>
              <Select value={cuadrillaId} onValueChange={(v) => { setCuadrillaId(v === "all" ? "" : v); setPage(1) }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas las cuadrillas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las cuadrillas</SelectItem>
                  {cuadrillas.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nombre_cuadrilla}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Desde</label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => { setFechaDesde(e.target.value); setPage(1) }}
                className="h-9"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Hasta</label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => { setFechaHasta(e.target.value); setPage(1) }}
                className="h-9"
              />
            </div>

            {(estatus || cuadrillaId || fechaDesde || fechaHasta) && (
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
                  <X className="w-3 h-3 mr-1" />
                  Limpiar filtros
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            <span className="ml-2 text-sm text-gray-500">Cargando instalaciones...</span>
          </div>
        ) : filteredInstalaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <WrenchIcon className="w-10 h-10 mb-2" />
            <p className="text-sm">No se encontraron instalaciones</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-orange-50 to-blue-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Cliente</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Cuadrilla</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Fecha Prog.</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">F. Ingreso</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">F. Finalizacion</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Horario</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Estatus</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Duracion</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-700">Acciones</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-700">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInstalaciones.map((inst) => (
                    <tr key={inst.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{inst.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 truncate max-w-[200px]">
                          {inst.contratos?.clientes?.nombre_completo || "-"}
                        </div>
                        <div className="text-xs text-gray-400">Contrato #{inst.contrato_id}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs">
                        {inst.cuadrillas?.nombre_cuadrilla || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">
                        {formatDate(inst.fecha_programada)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">
                        {formatDate(inst.created_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">
                        {formatDate(inst.fecha_real_instalacion)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs">
                        {inst.bloque_horario || "-"}
                      </td>
                      <td className="px-4 py-3">{getEstatusBadge(inst.estatus_instalacion)}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {calcDuration(inst.hora_inicio, inst.hora_fin)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditFecha(inst)}
                            className="h-7 px-2 text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
                            title="Editar fecha programada"
                          >
                            <Calendar className="w-3.5 h-3.5 mr-1" />
                            Fecha
                          </Button>
                          {inst.estatus_instalacion === "fallido" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReactivate(inst.id, "instalacion")}
                              disabled={reactivating === inst.id}
                              className="h-7 px-2 text-xs border-green-200 text-green-600 hover:bg-green-50"
                              title="Reactivar como Programada"
                            >
                              {reactivating === inst.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <><RotateCcw className="w-3.5 h-3.5 mr-1" />Reactivar</>
                              }
                            </Button>
                          )}
                          {(inst.estatus_instalacion === "programada" || inst.estatus_instalacion === "fallido") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReassign(inst.id, "instalacion")}
                              className="h-7 px-2 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                              title="Reasignar cuadrilla"
                            >
                              <Users className="w-3.5 h-3.5 mr-1" />
                              Cuadrilla
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(inst)} className="h-7 w-7 p-0">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-gray-100">
              {filteredInstalaciones.map((inst) => (
                <div key={inst.id} className="p-4 space-y-3">
                  <button
                    onClick={() => openDetail(inst)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {inst.contratos?.clientes?.nombre_completo || "-"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          #{inst.id} - Contrato #{inst.contrato_id}
                        </p>
                      </div>
                      {getEstatusBadge(inst.estatus_instalacion)}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {formatDate(inst.fecha_programada)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {calcDuration(inst.hora_inicio, inst.hora_fin)}
                      </span>
                      {inst.cuadrillas && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {inst.cuadrillas.nombre_cuadrilla}
                        </span>
                      )}
                    </div>
                    {(() => {
                      const photoCount = [
                        inst.url_foto_potencia_caset, inst.url_foto_pi_fibra, inst.url_foto_pf_fibra,
                        inst.url_foto_numeracion_nap, inst.url_foto_etiqueta_cliente_nap, inst.url_foto_potencia_liuk,
                        inst.url_foto_serie_equipo, inst.url_foto_potencia_interna, inst.url_foto_contrasena,
                        inst.url_foto_test_velocidad, inst.url_foto_estetico_equipos, inst.url_foto_tv_pantalla
                      ].filter(Boolean).length
                      return photoCount > 0 || inst.url_firma_cliente ? (
                        <div className="flex items-center gap-1 mt-2">
                          {photoCount > 0 && <ImageIcon className="w-3.5 h-3.5 text-green-500" />}
                          {inst.url_firma_cliente && <FileSignature className="w-3.5 h-3.5 text-purple-500" />}
                          <span className="text-xs text-gray-400 ml-1">{photoCount} fotos + firma</span>
                        </div>
                      ) : null
                    })()}
                  </button>
                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditFecha(inst)}
                      className="h-7 px-2 text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
                    >
                      <Calendar className="w-3.5 h-3.5 mr-1" />
                      Fecha
                    </Button>
                    {inst.estatus_instalacion === "fallido" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReactivate(inst.id, "instalacion")}
                        disabled={reactivating === inst.id}
                        className="h-7 px-2 text-xs border-green-200 text-green-600 hover:bg-green-50"
                      >
                        {reactivating === inst.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <><RotateCcw className="w-3.5 h-3.5 mr-1" />Reactivar</>
                        }
                      </Button>
                    )}
                    {(inst.estatus_instalacion === "programada" || inst.estatus_instalacion === "fallido") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReassign(inst.id, "instalacion")}
                        className="h-7 px-2 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        <Users className="w-3.5 h-3.5 mr-1" />
                        Cuadrilla
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => openPhotosModal(inst)}
                      className="h-7 px-3 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      <ImageIcon className="w-3.5 h-3.5 mr-1" />
                      Fotos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetail(inst)}
                      className="h-7 px-2 text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Detalle
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Pagina {page} de {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      </>}

      {/* =================== FALLAS TAB =================== */}
      {activeTab === "fallas" && <>
      {/* Fallas Search and Filters */}
      <Card className="p-4 space-y-3">
        <form onSubmit={(e) => { e.preventDefault(); setFallasPage(1); loadFallas() }} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre de cliente o # contrato..."
              value={fallasSearch}
              onChange={(e) => setFallasSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">Buscar</Button>
        </form>

        {fallasShowFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Estatus</label>
              <Select value={fallasEstatus} onValueChange={(v) => { setFallasEstatus(v === "all" ? "" : v); setFallasPage(1) }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todos los estatus" /></SelectTrigger>
                <SelectContent>
                  {ESTATUS_FALLA_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value || "all"}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Cuadrilla</label>
              <Select value={fallasCuadrillaId} onValueChange={(v) => { setFallasCuadrillaId(v === "all" ? "" : v); setFallasPage(1) }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todas las cuadrillas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las cuadrillas</SelectItem>
                  {cuadrillas.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nombre_cuadrilla}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Desde</label>
              <Input type="date" value={fallasFechaDesde} onChange={(e) => { setFallasFechaDesde(e.target.value); setFallasPage(1) }} className="h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Hasta</label>
              <Input type="date" value={fallasFechaHasta} onChange={(e) => { setFallasFechaHasta(e.target.value); setFallasPage(1) }} className="h-9" />
            </div>
            {(fallasEstatus || fallasCuadrillaId || fallasFechaDesde || fallasFechaHasta) && (
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setFallasEstatus(""); setFallasCuadrillaId(""); setFallasFechaDesde(""); setFallasFechaHasta(""); setFallasPage(1) }} className="text-gray-500">
                  <X className="w-3 h-3 mr-1" />Limpiar filtros
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Fallas Table */}
      <Card className="overflow-hidden">
        {fallasLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            <span className="ml-2 text-sm text-gray-500">Cargando fallas...</span>
          </div>
        ) : fallas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <WifiOff className="w-10 h-10 mb-2" />
            <p className="text-sm">No se encontraron fallas</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Cliente</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Tipo Falla</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Cuadrilla</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Fecha Prog.</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">F. Ingreso</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">F. Finalizacion</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Horario</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Estatus</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Tel. Adicional</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Duracion</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {fallas.map((falla) => (
                    <tr key={falla.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{falla.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 truncate max-w-[180px]">
                          {falla.contratos?.clientes?.nombre_completo || "-"}
                        </div>
                        <div className="text-xs text-gray-400">Contrato #{falla.contrato_id}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">{falla.tipo_falla || "-"}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{falla.cuadrillas?.nombre_cuadrilla || "-"}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                        {formatDate(falla.fecha_programada)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                        {formatDate(falla.created_at)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                        {formatDate(falla.fecha_real_resolucion)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">{falla.bloque_horario || "-"}</td>
                      <td className="px-4 py-3">{getEstatusFallaBadge(falla.estatus_falla)}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{falla.telefono_contacto_adicional || "-"}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{calcDuration(falla.hora_inicio, falla.hora_fin)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditFallaFecha(falla)}
                            className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                            title="Editar fecha programada"
                          >
                            <Calendar className="w-3.5 h-3.5 mr-1" />
                            Fecha
                          </Button>
                          {falla.estatus_falla === "fallida" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReactivate(falla.id, "falla")}
                              disabled={reactivating === falla.id}
                              className="h-7 px-2 text-xs border-green-200 text-green-600 hover:bg-green-50"
                              title="Reactivar como Programada"
                            >
                              {reactivating === falla.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <><RotateCcw className="w-3.5 h-3.5 mr-1" />Reactivar</>
                              }
                            </Button>
                          )}
                          {(falla.estatus_falla === "programada" || falla.estatus_falla === "fallida") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReassign(falla.id, "falla")}
                              className="h-7 px-2 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                              title="Reasignar cuadrilla"
                            >
                              <Users className="w-3.5 h-3.5 mr-1" />
                              Cuadrilla
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Fallas */}
            <div className="lg:hidden divide-y divide-gray-100">
              {fallas.map((falla) => (
                <div key={falla.id} className="p-4 space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {falla.contratos?.clientes?.nombre_completo || "-"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">#{falla.id} - Contrato #{falla.contrato_id}</p>
                      </div>
                      {getEstatusFallaBadge(falla.estatus_falla)}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{formatDate(falla.fecha_programada)}</span>
                      {falla.tipo_falla && <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{falla.tipo_falla}</span>}
                      {falla.cuadrillas && <span className="flex items-center gap-1"><User className="w-3 h-3" />{falla.cuadrillas.nombre_cuadrilla}</span>}
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditFallaFecha(falla)}
                      className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Calendar className="w-3.5 h-3.5 mr-1" />
                      Fecha
                    </Button>
                    {falla.estatus_falla === "fallida" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReactivate(falla.id, "falla")}
                        disabled={reactivating === falla.id}
                        className="h-7 px-2 text-xs border-green-200 text-green-600 hover:bg-green-50"
                      >
                        {reactivating === falla.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <><RotateCcw className="w-3.5 h-3.5 mr-1" />Reactivar</>
                        }
                      </Button>
                    )}
                    {(falla.estatus_falla === "programada" || falla.estatus_falla === "fallida") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReassign(falla.id, "falla")}
                        className="h-7 px-2 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        <Users className="w-3.5 h-3.5 mr-1" />
                        Cuadrilla
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Fallas Pagination */}
            {fallasTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Pagina {fallasPage} de {fallasTotalPages}</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setFallasPage(Math.max(1, fallasPage - 1))} disabled={fallasPage <= 1} className="h-8 w-8 p-0">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setFallasPage(Math.min(fallasTotalPages, fallasPage + 1))} disabled={fallasPage >= fallasTotalPages} className="h-8 w-8 p-0">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
      </>}

      {/* =================== SEGUIMIENTO DE FALLOS TAB =================== */}
      {activeTab === "seguimiento" && (() => {
        // Group resolved fallas by contract for the master view
        type Grupo = {
          contrato_id: number
          cliente: string
          telefono: string | null
          cuadrillas: Set<number>
          ultimaResolucion: string | null
          fallas: Falla[]
        }
        const grupos = new Map<number, Grupo>()
        for (const f of seguimientoData) {
          if (!f.contrato_id) continue
          const existing = grupos.get(f.contrato_id)
          if (existing) {
            existing.fallas.push(f)
            if (f.cuadrilla_id) existing.cuadrillas.add(f.cuadrilla_id)
            if (f.fecha_real_resolucion && (!existing.ultimaResolucion || f.fecha_real_resolucion > existing.ultimaResolucion)) {
              existing.ultimaResolucion = f.fecha_real_resolucion
            }
          } else {
            grupos.set(f.contrato_id, {
              contrato_id: f.contrato_id,
              cliente: f.contratos?.clientes?.nombre_completo || "-",
              telefono: f.contratos?.clientes?.telefono || null,
              cuadrillas: new Set(f.cuadrilla_id ? [f.cuadrilla_id] : []),
              ultimaResolucion: f.fecha_real_resolucion,
              fallas: [f],
            })
          }
        }
        const gruposArr = Array.from(grupos.values()).sort((a, b) => b.fallas.length - a.fallas.length)
        const reincidencias = gruposArr.filter((g) => g.fallas.length >= 2)
        const totalCuadrillasUnicas = new Set(seguimientoData.map((f) => f.cuadrilla_id).filter(Boolean)).size

        // Timeline for selected contract
        const timeline = selectedContratoTimeline
          ? seguimientoData
              .filter((f) => f.contrato_id === selectedContratoTimeline)
              .sort((a, b) => {
                const da = a.fecha_real_resolucion || a.created_at || ""
                const db = b.fecha_real_resolucion || b.created_at || ""
                return da.localeCompare(db)
              })
          : []
        const timelineCliente = timeline[0]?.contratos?.clientes?.nombre_completo || ""

        return (
          <div className="space-y-4">
            {/* Filters */}
            <Card className="p-4">
              <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Cuadrilla
                  </label>
                  <Select value={seguimientoCuadrilla || "all"} onValueChange={(v) => setSeguimientoCuadrilla(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todas las cuadrillas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las cuadrillas</SelectItem>
                      {cuadrillas.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nombre_cuadrilla}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Resuelta desde
                  </label>
                  <Input
                    type="date"
                    value={seguimientoFechaDesde}
                    onChange={(e) => setSeguimientoFechaDesde(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Resuelta hasta
                  </label>
                  <Input
                    type="date"
                    value={seguimientoFechaHasta}
                    onChange={(e) => setSeguimientoFechaHasta(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={loadSeguimiento}
                    disabled={seguimientoLoading}
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {seguimientoLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Filter className="w-4 h-4 mr-2" />
                    )}
                    Aplicar
                  </Button>
                  {(seguimientoCuadrilla || seguimientoFechaDesde || seguimientoFechaHasta) && (
                    <Button
                      onClick={() => {
                        setSeguimientoCuadrilla("")
                        setSeguimientoFechaDesde("")
                        setSeguimientoFechaHasta("")
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Limpiar
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-4 border-l-4 border-l-amber-500">
                <p className="text-xs text-gray-500 font-medium">Contratos analizados</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{gruposArr.length}</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-red-500">
                <p className="text-xs text-gray-500 font-medium">Reincidencias detectadas</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{reincidencias.length}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">2+ fallas resueltas en mismo contrato</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-blue-500">
                <p className="text-xs text-gray-500 font-medium">Cuadrillas involucradas</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalCuadrillasUnicas}</p>
              </Card>
            </div>

            {/* Master table */}
            <Card className="p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Tabla de Reincidencia
                </h3>
                <Badge variant="outline" className="text-xs">
                  Click en una fila para ver el timeline
                </Badge>
              </div>

              {seguimientoLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
              ) : gruposArr.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <ShieldAlert className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm">No hay fallas resueltas para los filtros seleccionados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold text-gray-600">Contrato</th>
                        <th className="px-4 py-2.5 font-semibold text-gray-600">Cliente</th>
                        <th className="px-4 py-2.5 font-semibold text-gray-600 text-center">Fallas</th>
                        <th className="px-4 py-2.5 font-semibold text-gray-600 text-center">Cuadrillas</th>
                        <th className="px-4 py-2.5 font-semibold text-gray-600">Ultima resolucion</th>
                        <th className="px-4 py-2.5 font-semibold text-gray-600 text-center">Estado</th>
                        <th className="px-4 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {gruposArr.map((g) => {
                        const isReincidencia = g.fallas.length >= 2
                        return (
                          <tr
                            key={g.contrato_id}
                            onClick={() => setSelectedContratoTimeline(g.contrato_id)}
                            className={`border-t border-gray-100 cursor-pointer transition-colors ${
                              isReincidencia
                                ? "bg-red-50/60 hover:bg-red-100/70"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <td className="px-4 py-2.5 font-mono text-xs text-gray-700">
                              #{g.contrato_id}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="font-medium text-gray-900">{g.cliente}</div>
                              {g.telefono && (
                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3" />
                                  {g.telefono}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span
                                className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-bold ${
                                  isReincidencia
                                    ? "bg-red-500 text-white"
                                    : "bg-gray-200 text-gray-700"
                                }`}
                              >
                                {g.fallas.length}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center text-gray-700">
                              {g.cuadrillas.size}
                            </td>
                            <td className="px-4 py-2.5 text-gray-700">
                              {formatDate(g.ultimaResolucion)}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {isReincidencia ? (
                                <Badge className="bg-red-500 hover:bg-red-500 text-white gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  REINCIDENCIA
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-gray-500">
                                  Normal
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedContratoTimeline(g.contrato_id)
                                }}
                              >
                                <History className="w-4 h-4 mr-1" />
                                Timeline
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Timeline dialog */}
            <Dialog
              open={selectedContratoTimeline !== null}
              onOpenChange={(open) => {
                if (!open) setSelectedContratoTimeline(null)
              }}
            >
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="flex items-center gap-2">
                        <History className="w-5 h-5 text-amber-500" />
                        Timeline de Auditoria
                      </DialogTitle>
                      <p className="text-xs text-gray-500 mt-1">
                        Contrato #{selectedContratoTimeline} - {timelineCliente}
                        <span className="ml-2 text-amber-600 font-semibold">
                          ({timeline.length} {timeline.length === 1 ? "visita" : "visitas"})
                        </span>
                      </p>
                    </div>
                    {timeline.length > 0 && (
                      <Button
                        size="sm"
                        onClick={() => {
                          // Export the full timeline of the selected contract as CSV.
                          // Contains every visit (first + reincidencias) with cuadrilla,
                          // tipo de falla, descripcion del cliente y observaciones del tecnico.
                          const headers = [
                            "Visita",
                            "Etapa",
                            "Fecha Resolucion",
                            "Cuadrilla",
                            "Lider",
                            "Tipo Falla",
                            "Descripcion Reportada",
                            "Observaciones Tecnico",
                          ]
                          const rows = timeline.map((f, idx) => [
                            idx + 1,
                            idx === 0 ? "Primera visita" : "Reincidencia",
                            formatDate(f.fecha_real_resolucion),
                            f.cuadrillas?.nombre_cuadrilla || "Sin cuadrilla",
                            f.cuadrillas?.lider_nombre || "-",
                            f.tipo_falla || "-",
                            f.descripcion_falla || "-",
                            f.observaciones_tecnico || "-",
                          ])
                          const today = new Date().toISOString().slice(0, 10)
                          const safeCliente = (timelineCliente || "cliente")
                            .replace(/[^a-zA-Z0-9]+/g, "_")
                            .toLowerCase()
                            .slice(0, 30)
                          downloadCsv(
                            headers,
                            rows,
                            `seguimiento_contrato_${selectedContratoTimeline}_${safeCliente}_${today}.csv`,
                          )
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Exportar Excel
                      </Button>
                    )}
                  </div>
                </DialogHeader>

                {timeline.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 text-sm">
                    Sin registros para mostrar
                  </div>
                ) : (
                  <div className="relative pl-6 mt-2">
                    {/* Vertical timeline line */}
                    <div className="absolute left-[10px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-amber-400 via-amber-300 to-gray-200" />

                    {timeline.map((f, idx) => (
                      <div key={f.id} className="relative pb-5 last:pb-0">
                        {/* Dot */}
                        <div
                          className={`absolute -left-[19px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                            idx === 0
                              ? "bg-blue-500 border-blue-600 text-white"
                              : "bg-amber-500 border-amber-600 text-white"
                          }`}
                        >
                          {idx + 1}
                        </div>

                        <Card className="p-3 ml-2 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="font-medium">
                                  {formatDate(f.fecha_real_resolucion)}
                                </span>
                                {idx === 0 && (
                                  <Badge variant="outline" className="text-[10px] py-0 h-4 border-blue-300 text-blue-600">
                                    Primera visita
                                  </Badge>
                                )}
                                {idx > 0 && (
                                  <Badge className="text-[10px] py-0 h-4 bg-amber-100 text-amber-700 hover:bg-amber-100">
                                    Reincidencia
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm font-semibold text-gray-900 mt-1 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-gray-400" />
                                {f.cuadrillas?.nombre_cuadrilla || "Sin cuadrilla"}
                                {f.cuadrillas?.lider_nombre && (
                                  <span className="text-xs font-normal text-gray-500">
                                    ({f.cuadrillas.lider_nombre})
                                  </span>
                                )}
                              </div>
                            </div>
                            {f.tipo_falla && (
                              <Badge variant="outline" className="text-xs whitespace-nowrap">
                                {f.tipo_falla}
                              </Badge>
                            )}
                          </div>

                          {f.descripcion_falla && (
                            <div className="mt-2 text-xs">
                              <span className="font-semibold text-red-600">Reportado: </span>
                              <span className="text-gray-700">{f.descripcion_falla}</span>
                            </div>
                          )}
                          {f.observaciones_tecnico && (
                            <div className="mt-1.5 text-xs">
                              <span className="font-semibold text-green-600">Tecnico: </span>
                              <span className="text-gray-700">{f.observaciones_tecnico}</span>
                            </div>
                          )}
                        </Card>
                      </div>
                    ))}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        )
      })()}

      {/* =================== DASHBOARD TAB =================== */}
      {activeTab === "dashboard" && (
        <div className="space-y-4">
          {/* Month Selector & Refresh */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Mes:</label>
                <Input
                  type="month"
                  value={dashboardMes}
                  onChange={(e) => setDashboardMes(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button onClick={loadDashboard} disabled={dashboardLoading} variant="outline" size="sm">
                {dashboardLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Actualizar
              </Button>
            </div>
          </Card>

          {dashboardLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : dashboardData ? (
            <>
              {/* Activity Ticker */}
              <Card className="p-3 bg-gradient-to-r from-gray-900 to-gray-800 overflow-hidden">
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-900 to-transparent z-10" />
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-800 to-transparent z-10" />
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Actividad en Vivo</span>
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex gap-6 animate-marquee whitespace-nowrap">
                      {[...dashboardData.actividadReciente, ...dashboardData.actividadReciente].map((act, idx) => (
                        <span key={idx} className="inline-flex items-center gap-2 text-sm">
                          {act.tipo === "finalizada" && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
                          {act.tipo === "fallida" && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                          {act.tipo === "en_proceso" && <Timer className="w-3.5 h-3.5 text-yellow-400" />}
                          {act.tipo === "nueva" && <Calendar className="w-3.5 h-3.5 text-blue-400" />}
                          <span className={`font-medium ${
                            act.tipo === "finalizada" ? "text-green-300" :
                            act.tipo === "fallida" ? "text-red-300" :
                            act.tipo === "en_proceso" ? "text-yellow-300" :
                            "text-blue-300"
                          }`}>
                            {act.tipo === "finalizada" ? "Completada" :
                             act.tipo === "fallida" ? "Fallida" :
                             act.tipo === "en_proceso" ? "En proceso" :
                             "Programada"}
                          </span>
                          <span className="text-white font-semibold">Contrato #{act.contrato_id}</span>
                          <span className="text-gray-300">{act.cliente}</span>
                          <span className="text-gray-500">-</span>
                          <span className="text-gray-400">{act.cuadrilla}</span>
                          <span className="text-gray-500">({act.fecha})</span>
                          <span className="text-gray-600 mx-2">|</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <Card className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-3.5 h-3.5 opacity-80" />
                    <span className="text-[10px] font-medium opacity-80">Total Mes</span>
                  </div>
                  <p className="text-xl font-bold">{dashboardData.resumen.totalInstalaciones}</p>
                  <p className="text-[10px] opacity-70">instalaciones</p>
                </Card>
                <Card className="p-3 bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-3.5 h-3.5 opacity-80" />
                    <span className="text-[10px] font-medium opacity-80">Completadas</span>
                  </div>
                  <p className="text-xl font-bold">{dashboardData.resumen.instaladas}</p>
                  <p className="text-[10px] opacity-70">{dashboardData.resumen.tasaExito}% exito</p>
                </Card>
                <Card className="p-3 bg-gradient-to-br from-red-500 to-red-600 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-3.5 h-3.5 opacity-80" />
                    <span className="text-[10px] font-medium opacity-80">Fallidas</span>
                  </div>
                  <p className="text-xl font-bold">{dashboardData.resumen.fallidas}</p>
                  <p className="text-[10px] opacity-70">no completadas</p>
                </Card>
                <Card className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 opacity-80" />
                    <span className="text-[10px] font-medium opacity-80">Pendientes</span>
                  </div>
                  <p className="text-xl font-bold">{dashboardData.resumen.pendientes}</p>
                  <p className="text-[10px] opacity-70">en proceso</p>
                </Card>
                <Card className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Timer className="w-3.5 h-3.5 opacity-80" />
                    <span className="text-[10px] font-medium opacity-80">Duracion Prom.</span>
                  </div>
                  <p className="text-xl font-bold">
                    {dashboardData.resumen.promedioDuracionMinutos > 0 
                      ? `${Math.floor(dashboardData.resumen.promedioDuracionMinutos / 60)}h ${dashboardData.resumen.promedioDuracionMinutos % 60}m`
                      : "N/A"}
                  </p>
                  <p className="text-[10px] opacity-70">por instalacion</p>
                </Card>
              </div>

              {/* Daily Chart */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Instalaciones por Dia
                </h3>
                <div className="h-52 flex items-end gap-1 overflow-x-auto pb-6 relative">
                  {dashboardData.porDia.map((dia) => {
                    const maxTotal = Math.max(...dashboardData.porDia.map(d => d.total), 1)
                    const barHeight = dia.total > 0 ? Math.max((dia.total / maxTotal) * 160, 8) : 4
                    const dayNum = dia.fecha.split("-")[2]
                    return (
                      <div key={dia.fecha} className="flex flex-col items-center min-w-[20px] group relative">
                        <div 
                          className="w-4 rounded-t transition-all hover:opacity-80 flex flex-col justify-end overflow-hidden bg-gray-100"
                          style={{ height: `${barHeight}px` }}
                        >
                          {dia.total > 0 && (
                            <>
                              <div 
                                className="w-full bg-green-500" 
                                style={{ height: `${(dia.instaladas / dia.total) * barHeight}px` }}
                              />
                              <div 
                                className="w-full bg-red-500" 
                                style={{ height: `${(dia.fallidas / dia.total) * barHeight}px` }}
                              />
                              <div 
                                className="w-full bg-amber-400" 
                                style={{ height: `${(dia.pendientes / dia.total) * barHeight}px` }}
                              />
                            </>
                          )}
                        </div>
                        <span className="text-[9px] text-gray-400 mt-1">{dayNum}</span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-20">
                          <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                            <p className="font-semibold">{dia.fecha}</p>
                            <p className="text-green-400">Instaladas: {dia.instaladas}</p>
                            <p className="text-red-400">Fallidas: {dia.fallidas}</p>
                            <p className="text-amber-400">Pendientes: {dia.pendientes}</p>
                            <p className="text-blue-300 font-semibold">Total: {dia.total}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-center gap-4 text-xs mt-2">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> Instaladas</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Fallidas</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400" /> Pendientes</span>
                </div>
              </Card>

              {/* Fallas por Dia - vertical bar chart of reported failures per day */}
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Fallas por Dia
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Eventos de fallas reportados por dia en el mes seleccionado
                    </p>
                  </div>
                  {(() => {
                    const totalFallas = (dashboardData.fallasPorDia || []).reduce(
                      (acc, d) => acc + d.total,
                      0,
                    )
                    return (
                      <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-1 whitespace-nowrap">
                        {totalFallas} {totalFallas === 1 ? "falla" : "fallas"}
                      </span>
                    )
                  })()}
                </div>

                {(() => {
                  const data = dashboardData.fallasPorDia || []
                  if (data.length === 0 || data.every((d) => d.total === 0)) {
                    return (
                      <p className="text-center text-gray-400 py-12 text-sm">
                        No hay fallas registradas en este mes
                      </p>
                    )
                  }
                  const maxTotal = Math.max(...data.map((d) => d.total), 1)
                  // Find the worst day to highlight it in a darker red
                  const peakDay = data.reduce(
                    (acc, d) => (d.total > acc.total ? d : acc),
                    data[0],
                  )
                  return (
                    <>
                      <div className="h-52 flex items-end gap-1 overflow-x-auto pb-6 relative">
                        {data.map((dia) => {
                          // Bar height: 8px minimum for any value > 0, max 160px
                          const barHeight =
                            dia.total > 0
                              ? Math.max((dia.total / maxTotal) * 160, 8)
                              : 4
                          const dayNum = dia.fecha.split("-")[2]
                          const isPeak =
                            dia.total > 0 && dia.total === peakDay.total
                          return (
                            <div
                              key={dia.fecha}
                              className="flex flex-col items-center min-w-[20px] group relative"
                            >
                              <div
                                className={`w-4 rounded-t transition-all hover:opacity-80 ${
                                  dia.total === 0
                                    ? "bg-gray-100"
                                    : isPeak
                                    ? "bg-red-600"
                                    : "bg-red-400"
                                }`}
                                style={{ height: `${barHeight}px` }}
                              />
                              <span className="text-[9px] text-gray-400 mt-1">
                                {dayNum}
                              </span>
                              {/* Tooltip */}
                              <div className="absolute bottom-full mb-2 hidden group-hover:block z-20">
                                <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                                  <p className="font-semibold">{dia.fecha}</p>
                                  <p className="text-red-300">
                                    Fallas: <span className="font-bold">{dia.total}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex items-center justify-center gap-4 text-xs mt-2 text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded bg-red-400" /> Fallas
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded bg-red-600" /> Peak ({peakDay.total})
                        </span>
                      </div>
                    </>
                  )
                })()}
              </Card>

              {/* Cuadrillas Performance */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-500" />
                  Rendimiento por Cuadrilla
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Cuadrilla</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Lider</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-600">Total</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-600">Instaladas</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-600">Fallidas</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-600">Pendientes</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-600">Tiempo Prom.</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-600">Eficiencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.porCuadrilla.map((cuadrilla) => {
                        const eficiencia = cuadrilla.total > 0 ? Math.round((cuadrilla.instaladas / cuadrilla.total) * 100) : 0
                        return (
                          <tr key={cuadrilla.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-3 font-medium text-gray-900">{cuadrilla.nombre}</td>
                            <td className="py-3 px-3 text-gray-600">{cuadrilla.lider}</td>
                            <td className="py-3 px-3 text-center font-semibold">{cuadrilla.total}</td>
                            <td className="py-3 px-3 text-center text-green-600 font-medium">{cuadrilla.instaladas}</td>
                            <td className="py-3 px-3 text-center text-red-600 font-medium">{cuadrilla.fallidas}</td>
                            <td className="py-3 px-3 text-center text-amber-600 font-medium">{cuadrilla.pendientes}</td>
                            <td className="py-3 px-3 text-center text-purple-600 font-medium">
                              {cuadrilla.promedioDuracion > 0 
                                ? `${Math.floor(cuadrilla.promedioDuracion / 60)}h ${cuadrilla.promedioDuracion % 60}m`
                                : "N/A"}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                eficiencia >= 80 ? "bg-green-100 text-green-700" :
                                eficiencia >= 50 ? "bg-amber-100 text-amber-700" :
                                "bg-red-100 text-red-700"
                              }`}>
                                {eficiencia}%
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {dashboardData.porCuadrilla.length === 0 && (
                    <p className="text-center text-gray-400 py-8">No hay datos de cuadrillas para este mes</p>
                  )}
                </div>
              </Card>

              {/* Ordenes Reiterativas - Fallas por tipo */}
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Ordenes Reiterativas
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Total de eventos de fallas por tipo en el mes seleccionado
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-1 whitespace-nowrap">
                    {(dashboardData.ordenesReiterativas || []).reduce((acc, o) => acc + o.total, 0)} fallas
                  </span>
                </div>

                {(dashboardData.ordenesReiterativas || []).length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">
                    No hay fallas registradas en este mes
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const items = dashboardData.ordenesReiterativas || []
                      const maxTotal = Math.max(...items.map((o) => o.total), 1)
                      return items.map((orden, idx) => {
                        const pct = (orden.total / maxTotal) * 100
                        // Colors: darker/redder for the most reiterative, lighter for the rest
                        const rank = idx
                        const barColor =
                          rank === 0
                            ? "bg-red-500"
                            : rank === 1
                            ? "bg-orange-500"
                            : rank === 2
                            ? "bg-amber-500"
                            : "bg-gray-400"
                        return (
                          <div key={orden.tipo} className="group">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-medium text-gray-700 truncate pr-2">
                                {orden.tipo}
                              </span>
                              <span className="font-semibold text-gray-900 whitespace-nowrap">
                                {orden.total} {orden.total === 1 ? "evento" : "eventos"}
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden relative">
                              <div
                                className={`h-full ${barColor} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                                style={{ width: `${pct}%` }}
                              >
                                {pct >= 18 && (
                                  <span className="text-[10px] font-semibold text-white">
                                    {Math.round(pct)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                )}
              </Card>

              {/* Recent Activity List */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-500" />
                  Ultimas Actividades del Mes
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {dashboardData.actividadReciente.slice(0, 20).map((act, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        act.tipo === "finalizada" ? "bg-green-100" :
                        act.tipo === "fallida" ? "bg-red-100" :
                        act.tipo === "en_proceso" ? "bg-yellow-100" :
                        "bg-blue-100"
                      }`}>
                        {act.tipo === "finalizada" && <CheckCircle className="w-4 h-4 text-green-600" />}
                        {act.tipo === "fallida" && <XCircle className="w-4 h-4 text-red-600" />}
                        {act.tipo === "en_proceso" && <Timer className="w-4 h-4 text-yellow-600" />}
                        {act.tipo === "nueva" && <Calendar className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          Instalacion #{act.instalacion_id}
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                            act.tipo === "finalizada" ? "bg-green-100 text-green-700" :
                            act.tipo === "fallida" ? "bg-red-100 text-red-700" :
                            act.tipo === "en_proceso" ? "bg-yellow-100 text-yellow-700" :
                            "bg-blue-100 text-blue-700"
                          }`}>
                            {act.tipo === "finalizada" ? "Completada" :
                             act.tipo === "fallida" ? "Fallida" :
                             act.tipo === "en_proceso" ? "En Proceso" :
                             "Programada"}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 truncate">{act.cuadrilla}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">{act.fecha}</p>
                        <p className="text-xs text-gray-400">{act.hora}</p>
                      </div>
                    </div>
                  ))}
                  {dashboardData.actividadReciente.length === 0 && (
                    <p className="text-center text-gray-400 py-8">No hay actividad registrada este mes</p>
                  )}
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Selecciona un mes y presiona Actualizar para ver el dashboard</p>
            </Card>
          )}
        </div>
      )}

      {/* Reassign Cuadrilla Modal */}
      <Dialog open={reassignTarget !== null} onOpenChange={(open) => { if (!open) setReassignTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Reasignar Cuadrilla
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Cuadrilla</label>
              <Select value={reassignCuadrillaId} onValueChange={setReassignCuadrillaId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione una cuadrilla..." />
                </SelectTrigger>
                <SelectContent>
                  {cuadrillas.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre_cuadrilla}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setReassignTarget(null)} disabled={reassigning}>
                Cancelar
              </Button>
              <Button
                onClick={handleReassign}
                disabled={reassigning || !reassignCuadrillaId}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {reassigning
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
                  : <><Check className="w-4 h-4 mr-1" />Confirmar</>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Date Modal - Instalaciones */}
      <Dialog open={editingFechaId !== null} onOpenChange={(open) => { if (!open) cancelEditFecha() }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              Editar Fecha Programada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nueva Fecha</label>
              <Input
                type="date"
                value={editingFechaValue}
                onChange={(e) => setEditingFechaValue(e.target.value)}
                className="w-full"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={cancelEditFecha} disabled={savingFecha}>
                Cancelar
              </Button>
              <Button
                onClick={() => editingFechaId !== null && saveFecha(editingFechaId)}
                disabled={savingFecha || !editingFechaValue}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {savingFecha ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : <><Check className="w-4 h-4 mr-1" />Guardar</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Date Modal - Fallas */}
      <Dialog open={editingFallaFechaId !== null} onOpenChange={(open) => { if (!open) cancelEditFallaFecha() }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-500" />
              Editar Fecha Programada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nueva Fecha</label>
              <Input
                type="date"
                value={editingFallaFechaValue}
                onChange={(e) => setEditingFallaFechaValue(e.target.value)}
                className="w-full"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={cancelEditFallaFecha} disabled={savingFallaFecha}>
                Cancelar
              </Button>
              <Button
                onClick={() => editingFallaFechaId !== null && saveFallaFecha(editingFallaFechaId)}
                disabled={savingFallaFecha || !editingFallaFechaValue}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {savingFallaFecha ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : <><Check className="w-4 h-4 mr-1" />Guardar</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Instalacion #{selectedInstalacion?.id}
              {selectedInstalacion && getEstatusBadge(selectedInstalacion.estatus_instalacion)}
            </DialogTitle>
          </DialogHeader>

          {selectedInstalacion && (
            <div className="space-y-4">
              {/* Cliente Info */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</h3>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium text-gray-900">
                      {selectedInstalacion.contratos?.clientes?.nombre_completo || "-"}
                    </span>
                  </div>
                  {selectedInstalacion.contratos?.direccion && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                      <span>{selectedInstalacion.contratos?.clientes?.direccion || "-"}</span>
                    </div>
                  )}
                  {selectedInstalacion.contratos?.telefono && (
                    <p className="text-xs text-gray-500 ml-5">
                      Tel: {selectedInstalacion.contratos?.clientes?.telefono || "-"}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 ml-5">Contrato #{selectedInstalacion.contrato_id}</p>
                </div>
              </div>

              {/* Cuadrilla Info */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cuadrilla</h3>
                {selectedInstalacion.cuadrillas ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900">
                      {selectedInstalacion.cuadrillas.nombre_cuadrilla}
                    </p>
                    <p className="text-xs text-gray-500">
                      Lider: {selectedInstalacion.cuadrillas.lider_nombre}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Sin cuadrilla asignada</p>
                )}
              </div>

              {/* Paquete (editable) */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Paquete</h3>
                <Select
                  value={selectedInstalacion.contratos?.nombre_paquete || selectedInstalacion.paquete || ""}
                  onValueChange={(v) => handleUpdatePaquete(selectedInstalacion, v)}
                  disabled={savingPaquete}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Seleccionar paquete" />
                  </SelectTrigger>
                  <SelectContent>
                    {paquetes.map((p) => (
                      <SelectItem key={p.id} value={p.nombre}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-gray-400">
                  Cambiar el paquete actualiza el contrato maestro sin modificar el precio mensual.
                </p>
              </div>

              {/* Tiempos */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tiempos</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Fecha Programada</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedInstalacion.fecha_programada)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Bloque Horario</p>
                    <p className="font-medium text-gray-900">{selectedInstalacion.bloque_horario || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Fecha Real</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedInstalacion.fecha_real_instalacion)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Duracion</p>
                    <p className="font-medium text-gray-900">
                      {calcDuration(selectedInstalacion.hora_inicio, selectedInstalacion.hora_fin)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Hora Inicio</p>
                    <p className="font-medium text-gray-900">{formatTime(selectedInstalacion.hora_inicio)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Hora Fin</p>
                    <p className="font-medium text-gray-900">{formatTime(selectedInstalacion.hora_fin)}</p>
                  </div>
                </div>
              </div>

              {/* Equipos */}
              {(selectedInstalacion.serie_ont_router || selectedInstalacion.serie_antena_receptor) && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipos</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Serie ONT/Router</p>
                      <p className="font-mono text-xs font-medium text-gray-900">{selectedInstalacion.serie_ont_router || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Serie Antena/Receptor</p>
                      <p className="font-mono text-xs font-medium text-gray-900">{selectedInstalacion.serie_antena_receptor || "-"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Observaciones */}
              {selectedInstalacion.observaciones_tecnicas && (
                <div className="bg-yellow-50 rounded-lg p-3 space-y-2">
                  <h3 className="text-xs font-semibold text-yellow-600 uppercase tracking-wide flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Observaciones Tecnicas
                  </h3>
                  <p className="text-sm text-gray-700">{selectedInstalacion.observaciones_tecnicas}</p>
                </div>
              )}

              {/* Evidencias */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Evidencias (12 fotos)</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {([
                    { key: "url_foto_potencia_caset", label: "Potencia Caset" },
                    { key: "url_foto_pi_fibra", label: "PI Fibra" },
                    { key: "url_foto_pf_fibra", label: "PF Fibra" },
                    { key: "url_foto_numeracion_nap", label: "Num. NAP" },
                    { key: "url_foto_etiqueta_cliente_nap", label: "Etiq. NAP" },
                    { key: "url_foto_potencia_liuk", label: "Pot. LIUK" },
                    { key: "url_foto_serie_equipo", label: "Serie Equipo" },
                    { key: "url_foto_potencia_interna", label: "Pot. Interna" },
                    { key: "url_foto_contrasena", label: "Contrasena" },
                    { key: "url_foto_test_velocidad", label: "Test Veloc." },
                    { key: "url_foto_estetico_equipos", label: "Estetico" },
                    { key: "url_foto_tv_pantalla", label: "TV Pantalla" },
                  ] as { key: keyof Instalacion; label: string }[]).map(({ key, label }) => {
                    const url = selectedInstalacion[key] as string | null
                    return url ? (
                      <button
                        key={key}
                        onClick={() => setViewImage(url)}
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-200 hover:border-green-400 transition-colors group"
                      >
                        <img src={url} alt={label} className="w-full h-full object-cover" crossOrigin="anonymous" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className="absolute bottom-0 left-0 right-0 bg-green-600/80 text-white text-[9px] text-center py-0.5 truncate px-0.5">
                          {label}
                        </span>
                      </button>
                    ) : (
                      <div key={key} className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300">
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-[9px] mt-0.5 text-center px-1">{label}</span>
                      </div>
                    )
                  })}
                </div>
                {/* Firma del cliente */}
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Firma del Cliente</h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {selectedInstalacion.url_firma_cliente ? (
                    <button
                      onClick={() => setViewImage(selectedInstalacion.url_firma_cliente)}
                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-purple-200 hover:border-purple-400 transition-colors group"
                    >
                      <img src={selectedInstalacion.url_firma_cliente} alt="Firma cliente" className="w-full h-full object-cover bg-white" crossOrigin="anonymous" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="absolute bottom-0 left-0 right-0 bg-purple-600/80 text-white text-[9px] text-center py-0.5">
                        Firma
                      </span>
                    </button>
                  ) : (
                    <div className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300">
                      <FileSignature className="w-4 h-4" />
                      <span className="text-[9px] mt-0.5">Firma</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Photos Modal - Dedicated for 12 installation photos */}
      <Dialog open={showPhotosModal} onOpenChange={setShowPhotosModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Fotos de Instalacion #{photosInstalacion?.id}
            </DialogTitle>
          </DialogHeader>
          {photosInstalacion && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Evidencias (12 fotos)</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {([
                  { key: "url_foto_potencia_caset", label: "Potencia Caset" },
                  { key: "url_foto_pi_fibra", label: "PI Fibra" },
                  { key: "url_foto_pf_fibra", label: "PF Fibra" },
                  { key: "url_foto_numeracion_nap", label: "Num. NAP" },
                  { key: "url_foto_etiqueta_cliente_nap", label: "Etiq. NAP" },
                  { key: "url_foto_potencia_liuk", label: "Pot. LIUK" },
                  { key: "url_foto_serie_equipo", label: "Serie Equipo" },
                  { key: "url_foto_potencia_interna", label: "Pot. Interna" },
                  { key: "url_foto_contrasena", label: "Contrasena" },
                  { key: "url_foto_test_velocidad", label: "Test Veloc." },
                  { key: "url_foto_estetico_equipos", label: "Estetico" },
                  { key: "url_foto_tv_pantalla", label: "TV Pantalla" },
                ] as { key: keyof Instalacion; label: string }[]).map(({ key, label }) => {
                  const url = photosInstalacion[key] as string | null
                  return url ? (
                    <button
                      key={key}
                      onClick={() => setViewImage(url)}
                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-200 hover:border-green-400 transition-colors group"
                    >
                      <img src={url} alt={label} className="w-full h-full object-cover" crossOrigin="anonymous" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="absolute bottom-0 left-0 right-0 bg-green-600/80 text-white text-[10px] text-center py-0.5 truncate px-1">
                        {label}
                      </span>
                    </button>
                  ) : (
                    <div key={key} className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300">
                      <ImageIcon className="w-5 h-5" />
                      <span className="text-[10px] mt-1 text-center px-1">{label}</span>
                    </div>
                  )
                })}
              </div>
              
              {/* Firma */}
              <h3 className="text-sm font-semibold text-gray-700 pt-2">Firma del Cliente</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {photosInstalacion.url_firma_cliente ? (
                  <button
                    onClick={() => setViewImage(photosInstalacion.url_firma_cliente)}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-purple-200 hover:border-purple-400 transition-colors group"
                  >
                    <img src={photosInstalacion.url_firma_cliente} alt="Firma" className="w-full h-full object-cover bg-white" crossOrigin="anonymous" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="absolute bottom-0 left-0 right-0 bg-purple-600/80 text-white text-[10px] text-center py-0.5">
                      Firma
                    </span>
                  </button>
                ) : (
                  <div className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300">
                    <FileSignature className="w-5 h-5" />
                    <span className="text-[10px] mt-1">Firma</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Viewer */}
      <Dialog open={!!viewImage} onOpenChange={() => setViewImage(null)}>
        <DialogContent className="max-w-2xl p-2">
          <DialogHeader>
            <DialogTitle>Evidencia</DialogTitle>
          </DialogHeader>
          {viewImage && (
            <img
              src={viewImage}
              alt="Evidencia"
              className="w-full h-auto rounded-lg"
              crossOrigin="anonymous"
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
