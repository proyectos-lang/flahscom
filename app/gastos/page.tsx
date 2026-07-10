"use client"

import { useEffect, useMemo, useState } from "react"
import { redirect } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { exportToExcel } from "@/lib/export-excel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DollarSign,
  Plus,
  Wallet,
  Tag,
  Calendar,
  Trash2,
  Loader2,
  ShieldAlert,
  FileText,
  Receipt,
  Upload,
  ExternalLink,
  Pencil,
  TrendingUp,
  Filter,
  X,
  Download,
} from "lucide-react"

interface Categoria {
  id: number
  nombre: string
  descripcion: string | null
}

interface Gasto {
  id: number
  categoria_id: number
  monto: number
  fecha: string
  descripcion: string | null
  metodo_pago: string | null
  url_comprobante: string | null
  created_at: string
  categorias_gastos?: { id: number; nombre: string } | null
}

const METODOS_PAGO = ["Efectivo", "Transferencia", "Tarjeta", "Cheque", "Otro"] as const

const formatLps = (n: number) =>
  new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    maximumFractionDigits: 2,
  }).format(n || 0)

export default function GastosPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { toast } = useToast()

  // Permission guard
  useEffect(() => {
    if (!authLoading && (!user || !(user.permissions as any)?.gastos)) {
      // Soft redirect: only if auth is resolved and permission is missing
      // Keep showing the "Acceso Denegado" UI for an instant before redirecting
      const timer = setTimeout(() => redirect("/dashboard"), 1500)
      return () => clearTimeout(timer)
    }
  }, [user, authLoading])

  // State
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)

  // Filters for gastos table
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas")
  const [filtroDesde, setFiltroDesde] = useState<string>("")
  const [filtroHasta, setFiltroHasta] = useState<string>("")

  // Gasto form modal
  const [gastoDialogOpen, setGastoDialogOpen] = useState(false)
  const [savingGasto, setSavingGasto] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [gastoForm, setGastoForm] = useState({
    categoria_id: "",
    monto: "",
    fecha: new Date().toISOString().split("T")[0],
    descripcion: "",
    metodo_pago: "Efectivo",
    url_comprobante: "",
  })

  // Category management
  const [catForm, setCatForm] = useState({ nombre: "", descripcion: "" })
  const [editingCat, setEditingCat] = useState<Categoria | null>(null)
  const [savingCat, setSavingCat] = useState(false)

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean
    type: "gasto" | "categoria" | null
    id: number | null
    label: string
  }>({ open: false, type: null, id: null, label: "" })

  const loadCategorias = async () => {
    try {
      const res = await fetch("/api/categorias-gastos")
      const data = await res.json()
      if (Array.isArray(data)) setCategorias(data)
    } catch (error) {
      console.error("[v0] Error loading categorias:", error)
    }
  }

  const loadGastos = async () => {
    try {
      const params = new URLSearchParams()
      if (filtroCategoria !== "todas") params.set("categoria_id", filtroCategoria)
      if (filtroDesde) params.set("fecha_desde", filtroDesde)
      if (filtroHasta) params.set("fecha_hasta", filtroHasta)
      const res = await fetch(`/api/gastos?${params.toString()}`)
      const data = await res.json()
      if (Array.isArray(data)) setGastos(data)
    } catch (error) {
      console.error("[v0] Error loading gastos:", error)
    }
  }

  // CSV download helper (opens in Excel natively with BOM for UTF-8)
  const exportGastosExcel = () => {
    if (!gastos || gastos.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay gastos para exportar",
        variant: "destructive",
      })
      return
    }

    const headers = [
      "ID",
      "Fecha",
      "Categoria",
      "Descripcion",
      "Metodo de Pago",
      "Monto (HNL)",
      "Comprobante",
    ]

    const rows = gastos.map((g) => [
      g.id,
      g.fecha,
      g.categorias_gastos?.nombre || "-",
      g.descripcion || "-",
      g.metodo_pago || "-",
      Number(g.monto || 0),
      g.url_comprobante ? "Si" : "No",
    ])

    const today = new Date().toISOString().slice(0, 10)
    exportToExcel({ filename: `gastos_${today}`, sheetName: "Gastos", headers, rows })

    toast({
      title: "Exportado",
      description: `Se exportaron ${gastos.length} gastos`,
    })
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([loadCategorias(), loadGastos()])
      setLoading(false)
    }
    if (user && (user.permissions as any)?.gastos) init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (user && (user.permissions as any)?.gastos) loadGastos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroCategoria, filtroDesde, filtroHasta])

  // --- Dashboard calculations (current month) ---
  const { gastoMes, desgloseCategoria, gastoHoy, totalFiltrado } = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const todayStr = now.toISOString().split("T")[0]

    let gastoMes = 0
    let gastoHoy = 0
    let totalFiltrado = 0
    const desglose: Record<string, { nombre: string; total: number; count: number }> = {}

    for (const g of gastos) {
      const monto = Number(g.monto) || 0
      totalFiltrado += monto

      const f = new Date(g.fecha)
      if (f.getFullYear() === year && f.getMonth() === month) {
        gastoMes += monto
        const key = String(g.categoria_id)
        const nombre = g.categorias_gastos?.nombre || "Sin categoria"
        if (!desglose[key]) desglose[key] = { nombre, total: 0, count: 0 }
        desglose[key].total += monto
        desglose[key].count += 1
      }
      if (g.fecha === todayStr) gastoHoy += monto
    }

    const desgloseCategoria = Object.values(desglose).sort((a, b) => b.total - a.total)
    return { gastoMes, desgloseCategoria, gastoHoy, totalFiltrado }
  }, [gastos])

  // --- Handlers ---
  const resetGastoForm = () => {
    setGastoForm({
      categoria_id: "",
      monto: "",
      fecha: new Date().toISOString().split("T")[0],
      descripcion: "",
      metodo_pago: "Efectivo",
      url_comprobante: "",
    })
  }

  const handleUploadComprobante = async (file: File) => {
    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/gastos/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || "Error al subir archivo")
      setGastoForm((prev) => ({ ...prev, url_comprobante: data.url }))
      toast({ title: "Comprobante subido", description: "Archivo cargado correctamente" })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo subir el comprobante",
        variant: "destructive",
      })
    } finally {
      setUploadingFile(false)
    }
  }

  const handleSaveGasto = async () => {
    if (!gastoForm.categoria_id || !gastoForm.monto || !gastoForm.fecha) {
      toast({
        title: "Campos requeridos",
        description: "Debe completar categoria, monto y fecha",
        variant: "destructive",
      })
      return
    }
    setSavingGasto(true)
    try {
      const res = await fetch("/api/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria_id: Number(gastoForm.categoria_id),
          monto: Number(gastoForm.monto),
          fecha: gastoForm.fecha,
          descripcion: gastoForm.descripcion,
          metodo_pago: gastoForm.metodo_pago,
          url_comprobante: gastoForm.url_comprobante,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al registrar gasto")

      toast({ title: "Gasto registrado", description: "El gasto fue guardado correctamente" })
      setGastoDialogOpen(false)
      resetGastoForm()
      await loadGastos()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el gasto",
        variant: "destructive",
      })
    } finally {
      setSavingGasto(false)
    }
  }

  const handleSaveCategoria = async () => {
    const nombre = catForm.nombre.trim()
    if (!nombre) {
      toast({ title: "Nombre requerido", variant: "destructive" })
      return
    }
    setSavingCat(true)
    try {
      if (editingCat) {
        const res = await fetch(`/api/categorias-gastos/${editingCat.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre, descripcion: catForm.descripcion || null }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        toast({ title: "Categoria actualizada" })
      } else {
        const res = await fetch("/api/categorias-gastos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre, descripcion: catForm.descripcion || null }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        toast({ title: "Categoria creada" })
      }
      setCatForm({ nombre: "", descripcion: "" })
      setEditingCat(null)
      await loadCategorias()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSavingCat(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete.id || !confirmDelete.type) return
    try {
      const url =
        confirmDelete.type === "gasto"
          ? `/api/gastos/${confirmDelete.id}`
          : `/api/categorias-gastos/${confirmDelete.id}`
      const res = await fetch(url, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast({ title: "Eliminado correctamente" })
      setConfirmDelete({ open: false, type: null, id: null, label: "" })
      if (confirmDelete.type === "gasto") await loadGastos()
      else await loadCategorias()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const clearFiltros = () => {
    setFiltroCategoria("todas")
    setFiltroDesde("")
    setFiltroHasta("")
  }

  // --- Access guard UI ---
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!user || !(user.permissions as any)?.gastos) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <Card className="max-w-md w-full border-2 border-red-200">
          <CardContent className="pt-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Acceso Denegado</h2>
            <p className="text-sm text-gray-600">
              No cuentas con permisos para acceder al modulo de Gestion de Gastos. Seras redirigido al dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- Main UI ---
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Wallet className="w-7 h-7 text-emerald-600" />
              Gestion de Gastos
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Registra, categoriza y monitorea los gastos de la empresa
            </p>
          </div>
          <Button
            onClick={() => {
              resetGastoForm()
              setGastoDialogOpen(true)
            }}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Registrar Gasto
          </Button>
        </div>

        <Tabs defaultValue="resumen" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="resumen" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="categorias" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Categorias
            </TabsTrigger>
          </TabsList>

          {/* --- TAB 1: RESUMEN --- */}
          <TabsContent value="resumen" className="space-y-6 mt-6">
            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-white">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
                        Gasto Total del Mes
                      </p>
                      <p className="text-3xl md:text-4xl font-bold text-emerald-800 mt-2">
                        {formatLps(gastoMes)}
                      </p>
                      <p className="text-[11px] text-emerald-600/80 mt-1">Mes actual</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-white">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                        Gasto de Hoy
                      </p>
                      <p className="text-3xl md:text-4xl font-bold text-blue-800 mt-2">
                        {formatLps(gastoHoy)}
                      </p>
                      <p className="text-[11px] text-blue-600/80 mt-1">Movimientos del dia</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50 to-white">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                        Total Filtrado
                      </p>
                      <p className="text-3xl md:text-4xl font-bold text-amber-800 mt-2">
                        {formatLps(totalFiltrado)}
                      </p>
                      <p className="text-[11px] text-amber-600/80 mt-1">
                        {gastos.length} movimiento{gastos.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Desglose por categoria (mes actual) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  Desglose por Categoria (Mes Actual)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {desgloseCategoria.length === 0 ? (
                  <p className="text-center text-gray-400 py-6 text-sm">
                    No hay gastos registrados en el mes actual
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {desgloseCategoria.map((item) => {
                      const pct = gastoMes > 0 ? (item.total / gastoMes) * 100 : 0
                      return (
                        <div
                          key={item.nombre}
                          className="p-3 rounded-lg border border-gray-200 bg-white hover:border-emerald-300 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-600 truncate">
                              {item.nombre}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xl font-bold text-gray-900">{formatLps(item.total)}</p>
                          <p className="text-[10px] text-gray-500 mt-1">
                            {item.count} movimiento{item.count === 1 ? "" : "s"}
                          </p>
                          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Filtros */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-600" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Categoria</Label>
                    <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas las categorias</SelectItem>
                        {categorias.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Desde</Label>
                    <Input
                      type="date"
                      value={filtroDesde}
                      onChange={(e) => setFiltroDesde(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Hasta</Label>
                    <Input
                      type="date"
                      value={filtroHasta}
                      onChange={(e) => setFiltroHasta(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" onClick={clearFiltros} className="w-full">
                      <X className="w-4 h-4 mr-1" />
                      Limpiar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabla de gastos */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-gray-600" />
                    Gastos Registrados ({gastos.length})
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={exportGastosExcel}
                    disabled={gastos.length === 0}
                    className="bg-green-600 hover:bg-green-700 text-white h-8"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  </div>
                ) : gastos.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No hay gastos registrados</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">
                            Fecha
                          </th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">
                            Categoria
                          </th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">
                            Descripcion
                          </th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">
                            Metodo
                          </th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-600 text-xs">
                            Monto
                          </th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-600 text-xs">
                            Comprobante
                          </th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-600 text-xs">
                            Accion
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {gastos.map((g) => (
                          <tr
                            key={g.id}
                            className="border-b border-gray-100 hover:bg-emerald-50/40 transition-colors"
                          >
                            <td className="py-2 px-3 text-gray-700 whitespace-nowrap">
                              {new Date(g.fecha).toLocaleDateString("es-HN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="py-2 px-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                <Tag className="w-3 h-3" />
                                {g.categorias_gastos?.nombre || "-"}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-600 max-w-[250px] truncate">
                              {g.descripcion || "-"}
                            </td>
                            <td className="py-2 px-3 text-gray-600 text-xs">
                              {g.metodo_pago || "-"}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                              {formatLps(Number(g.monto))}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {g.url_comprobante ? (
                                <a
                                  href={g.url_comprobante}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                                >
                                  <FileText className="w-3 h-3" />
                                  Ver
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-gray-300 text-xs">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                                onClick={() =>
                                  setConfirmDelete({
                                    open: true,
                                    type: "gasto",
                                    id: g.id,
                                    label: `${g.descripcion || "este gasto"} - ${formatLps(Number(g.monto))}`,
                                  })
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

          {/* --- TAB 2: CATEGORIAS --- */}
          <TabsContent value="categorias" className="space-y-6 mt-6">
            <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  {editingCat ? "Editar Categoria" : "Nueva Categoria"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Nombre *</Label>
                    <Input
                      placeholder="Ej: Combustible"
                      value={catForm.nombre}
                      onChange={(e) => setCatForm({ ...catForm, nombre: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Descripcion (opcional)</Label>
                    <Input
                      placeholder="Descripcion breve"
                      value={catForm.descripcion}
                      onChange={(e) => setCatForm({ ...catForm, descripcion: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      onClick={handleSaveCategoria}
                      disabled={savingCat}
                      className="bg-blue-600 hover:bg-blue-700 flex-1"
                    >
                      {savingCat ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : editingCat ? (
                        "Actualizar"
                      ) : (
                        "Agregar"
                      )}
                    </Button>
                    {editingCat && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingCat(null)
                          setCatForm({ nombre: "", descripcion: "" })
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  Categorias Disponibles ({categorias.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categorias.length === 0 ? (
                  <div className="text-center py-12">
                    <Tag className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Aun no hay categorias registradas</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">
                            Nombre
                          </th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs">
                            Descripcion
                          </th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-600 text-xs w-28">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {categorias.map((c) => (
                          <tr
                            key={c.id}
                            className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors"
                          >
                            <td className="py-2 px-3 font-medium text-gray-800">{c.nombre}</td>
                            <td className="py-2 px-3 text-gray-500 text-xs">
                              {c.descripcion || "-"}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                                  onClick={() => {
                                    setEditingCat(c)
                                    setCatForm({
                                      nombre: c.nombre,
                                      descripcion: c.descripcion || "",
                                    })
                                  }}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                                  onClick={() =>
                                    setConfirmDelete({
                                      open: true,
                                      type: "categoria",
                                      id: c.id,
                                      label: c.nombre,
                                    })
                                  }
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* --- Register Gasto Dialog --- */}
      <Dialog open={gastoDialogOpen} onOpenChange={setGastoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Registrar Nuevo Gasto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Categoria *</Label>
              <Select
                value={gastoForm.categoria_id}
                onValueChange={(val) => setGastoForm({ ...gastoForm, categoria_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.length === 0 ? (
                    <div className="py-2 px-3 text-xs text-gray-500">
                      No hay categorias. Cree una en la pestana Categorias.
                    </div>
                  ) : (
                    categorias.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nombre}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Monto (L.) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={gastoForm.monto}
                  onChange={(e) => setGastoForm({ ...gastoForm, monto: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Fecha *</Label>
                <Input
                  type="date"
                  value={gastoForm.fecha}
                  onChange={(e) => setGastoForm({ ...gastoForm, fecha: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Metodo de pago</Label>
              <Select
                value={gastoForm.metodo_pago}
                onValueChange={(val) => setGastoForm({ ...gastoForm, metodo_pago: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Descripcion</Label>
              <Textarea
                placeholder="Detalle del gasto..."
                value={gastoForm.descripcion}
                onChange={(e) => setGastoForm({ ...gastoForm, descripcion: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <Label className="text-xs">Comprobante (foto o PDF)</Label>
              <div className="flex items-center gap-2">
                <label className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md cursor-pointer transition-colors border border-dashed border-gray-300">
                  {uploadingFile ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  {gastoForm.url_comprobante ? "Cambiar archivo" : "Subir archivo"}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={uploadingFile}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleUploadComprobante(f)
                      e.target.value = ""
                    }}
                  />
                </label>
                {gastoForm.url_comprobante && (
                  <a
                    href={gastoForm.url_comprobante}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Ver
                  </a>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGastoDialogOpen(false)}
              disabled={savingGasto}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveGasto}
              disabled={savingGasto || uploadingFile}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {savingGasto ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Delete Confirmation --- */}
      <Dialog
        open={confirmDelete.open}
        onOpenChange={(open) =>
          !open && setConfirmDelete({ open: false, type: null, id: null, label: "" })
        }
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="w-5 h-5" />
              Confirmar eliminacion
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            Esta seguro que desea eliminar{" "}
            <span className="font-semibold">{confirmDelete.label}</span>? Esta accion no se puede
            deshacer.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDelete({ open: false, type: null, id: null, label: "" })
              }
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
