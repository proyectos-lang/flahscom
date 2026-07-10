"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  Plus,
  PackagePlus,
  Search,
  Hash,
  Boxes,
  ChevronRight,
  ChevronDown,
  Warehouse,
  Users,
  ArrowLeftRight,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Producto {
  id: number
  nombre: string
  tipo: "Serializado" | "Miscelaneo" | string
  unidad_medida: string | null
  bodega: number
  en_cuadrillas: number
  instalado: number
  defectuoso: number
  total: number
  por_cuadrilla: Array<{
    cuadrilla_id: number
    nombre_cuadrilla: string
    cantidad: number
  }>
}

interface CuadrillaInfo {
  id: number
  nombre_cuadrilla: string
}

export function CatalogoStockTab({
  refreshKey,
  onChange,
  onGoToTransferencias,
}: {
  refreshKey: number
  onChange: () => void
  onGoToTransferencias?: () => void
}) {
  const { toast } = useToast()
  const [productos, setProductos] = useState<Producto[]>([])
  const [cuadrillas, setCuadrillas] = useState<CuadrillaInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filtroTipo, setFiltroTipo] = useState<string>("todos")
  // "bodega" or a cuadrilla_id (as string). Drives which column we show
  // stock for and which subset of rows is rendered.
  const [ubicacionSel, setUbicacionSel] = useState<string>("bodega")

  // New product modal
  const [showNew, setShowNew] = useState(false)
  const [npNombre, setNpNombre] = useState("")
  const [npTipo, setNpTipo] = useState<"Serializado" | "Miscelaneo">("Serializado")
  const [npUnidad, setNpUnidad] = useState("Unidad")
  // Initial stock captured at product-creation time. The intent is that any
  // serialized product should land with its physical units already loaded
  // into Bodega so we don't have a second "Ingreso" step that gets skipped.
  const [npSeries, setNpSeries] = useState("")
  const [npCantidad, setNpCantidad] = useState("")
  const [npOrigen, setNpOrigen] = useState("")
  const [savingNew, setSavingNew] = useState(false)
  // Hard-block double submissions. `savingNew` is async (state update is
  // batched after the click handler returns) so a fast double-click would
  // fire two requests and create the product twice. A ref flips synchronously.
  const submittingRef = useRef(false)

  // Ingreso modal
  const [showIngreso, setShowIngreso] = useState(false)
  const [ingresoProducto, setIngresoProducto] = useState<Producto | null>(null)
  const [seriesText, setSeriesText] = useState("")
  const [cantidad, setCantidad] = useState("")
  const [origen, setOrigen] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [savingIngreso, setSavingIngreso] = useState(false)

  // Detalle por cuadrilla
  const [detalle, setDetalle] = useState<Producto | null>(null)
  // Per-serial detail loaded lazily when the user opens a Serialized product.
  // Drives the table at the bottom of the detail dialog.
  const [seriales, setSeriales] = useState<any[]>([])
  const [loadingSeriales, setLoadingSeriales] = useState(false)
  const [serialSearch, setSerialSearch] = useState("")
  // "all" | "bodega" | "<cuadrilla_id>" | "instalado" | "defectuoso"
  const [serialFilter, setSerialFilter] = useState<string>("all")

  // Inline expansion of serialized rows. Each Serializado product can be
  // expanded to show the seriales currently sitting at the selected ubicacion.
  // We cache results keyed by `${productoId}:${ubicacionSel}` so toggling open
  // / collapsed doesn't re-fetch, but switching ubicacion invalidates naturally
  // because the cache key changes.
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [serialesCache, setSerialesCache] = useState<Record<string, any[]>>({})
  const [loadingRow, setLoadingRow] = useState<Record<number, boolean>>({})

  // Reset expansion whenever the user switches ubicacion. The cached seriales
  // for previous ubicaciones stay in memory (cheap) but the visible accordions
  // collapse to keep the UI predictable.
  useEffect(() => {
    setExpandedRows(new Set())
  }, [ubicacionSel])

  // Edit product modal — used to rename a product (and update its unidad).
  // Tipo is intentionally read-only post-creation because flipping it would
  // invalidate every serial / kardex row downstream.
  const [editProducto, setEditProducto] = useState<Producto | null>(null)
  const [editNombre, setEditNombre] = useState("")
  const [editUnidad, setEditUnidad] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete confirmation. Stored as a Producto so we can show its name in the
  // confirm dialog and disable the button while the request is in flight.
  const [deleteProducto, setDeleteProducto] = useState<Producto | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Inline serial editing inside the expanded row. We track which serial id
  // is currently being edited and the draft value. Only one serial at a time
  // is editable (mirrors how Excel handles inline edits — predictable).
  const [editingSerialId, setEditingSerialId] = useState<number | null>(null)
  const [editingSerialValue, setEditingSerialValue] = useState("")
  const [savingSerial, setSavingSerial] = useState(false)

  const openEditProducto = (p: Producto) => {
    setEditProducto(p)
    setEditNombre(p.nombre)
    setEditUnidad(p.unidad_medida || "Unidad")
  }

  const submitEditProducto = async () => {
    if (!editProducto) return
    const nombre = editNombre.trim()
    if (!nombre) {
      toast({ title: "Nombre requerido", variant: "destructive" })
      return
    }
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/inventario/productos/${editProducto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, unidad_medida: editUnidad.trim() || "Unidad" }),
      })
      const json = await res.json()
      if (!json.success) {
        toast({ title: "Error", description: json.error, variant: "destructive" })
        return
      }
      toast({ title: "Producto actualizado" })
      setEditProducto(null)
      await loadStock()
      onChange()
    } finally {
      setSavingEdit(false)
    }
  }

  const submitDeleteProducto = async () => {
    if (!deleteProducto) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/inventario/productos/${deleteProducto.id}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!json.success) {
        toast({ title: "Error", description: json.error, variant: "destructive" })
        return
      }
      toast({
        title: "Producto eliminado",
        description: "Se borraron tambien sus seriales y movimientos del kardex.",
      })
      setDeleteProducto(null)
      // Drop any cached seriales for this product so re-expanding another
      // product later doesn't accidentally render stale entries.
      setSerialesCache((c) => {
        const copy: Record<string, any[]> = {}
        for (const k of Object.keys(c)) {
          if (!k.startsWith(`${deleteProducto.id}:`)) copy[k] = c[k]
        }
        return copy
      })
      await loadStock()
      onChange()
    } finally {
      setDeleting(false)
    }
  }

  const startEditSerial = (s: any) => {
    setEditingSerialId(s.id)
    setEditingSerialValue(s.numero_serie || "")
  }

  const cancelEditSerial = () => {
    setEditingSerialId(null)
    setEditingSerialValue("")
  }

  const submitEditSerial = async (productoId: number) => {
    if (editingSerialId == null) return
    const numero_serie = editingSerialValue.trim()
    if (!numero_serie) {
      toast({ title: "Numero de serie requerido", variant: "destructive" })
      return
    }
    setSavingSerial(true)
    try {
      const res = await fetch(`/api/inventario/seriales/${editingSerialId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero_serie }),
      })
      const json = await res.json()
      if (!json.success) {
        toast({ title: "Error", description: json.error, variant: "destructive" })
        return
      }
      // Patch the cache in-place so the row updates without a refetch.
      const cacheKey = `${productoId}:${ubicacionSel}`
      setSerialesCache((c) => {
        const list = c[cacheKey]
        if (!list) return c
        return {
          ...c,
          [cacheKey]: list.map((x) =>
            x.id === editingSerialId ? { ...x, numero_serie } : x,
          ),
        }
      })
      toast({ title: "Serial actualizado" })
      cancelEditSerial()
    } finally {
      setSavingSerial(false)
    }
  }

  // Single-serial deletion. Confirms via a dialog (the destructive action is
  // not undoable since we cascade-delete kardex rows that referenced it). The
  // aggregate stock counters are re-fetched via loadStock() afterwards so the
  // bodega/cuadrillas totals stay accurate.
  const [deleteSerial, setDeleteSerial] = useState<{
    serial: any
    productoId: number
    productoNombre: string
  } | null>(null)
  const [deletingSerial, setDeletingSerial] = useState(false)

  const submitDeleteSerial = async () => {
    if (!deleteSerial) return
    setDeletingSerial(true)
    try {
      const res = await fetch(
        `/api/inventario/seriales/${deleteSerial.serial.id}`,
        { method: "DELETE" },
      )
      const json = await res.json()
      if (!json.success) {
        toast({ title: "Error", description: json.error, variant: "destructive" })
        return
      }
      // Remove the serial from the cache for the current ubicacion (the only
      // place where it was rendered). Other ubicaciones can't have it because
      // a serial only exists in one place at a time.
      const cacheKey = `${deleteSerial.productoId}:${ubicacionSel}`
      setSerialesCache((c) => {
        const list = c[cacheKey]
        if (!list) return c
        return {
          ...c,
          [cacheKey]: list.filter((x) => x.id !== deleteSerial.serial.id),
        }
      })
      toast({
        title: "Serial eliminado",
        description: "Se borraron tambien sus movimientos del kardex.",
      })
      setDeleteSerial(null)
      // Refresh aggregate counts (bodega / en_cuadrillas / instalado / etc).
      await loadStock()
      onChange()
    } finally {
      setDeletingSerial(false)
    }
  }

  useEffect(() => {
    loadStock()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const loadStock = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/inventario/stock")
      const json = await res.json()
      if (json.success) {
        setProductos(json.data.productos || [])
        setCuadrillas(json.data.cuadrillas || [])
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" })
      }
    } finally {
      setLoading(false)
    }
  }

  // Load per-serial breakdown when opening a Serializado product. We hit the
  // existing /api/inventario/seriales endpoint (no new endpoint needed) and
  // reset filters so the dialog always opens with a clean state.
  useEffect(() => {
    if (!detalle || detalle.tipo !== "Serializado") {
      setSeriales([])
      return
    }
    let cancelled = false
    const run = async () => {
      setLoadingSeriales(true)
      setSerialSearch("")
      setSerialFilter("all")
      try {
        const res = await fetch(
          `/api/inventario/seriales?producto_id=${detalle.id}`,
        )
        const json = await res.json()
        if (!cancelled && json.success) setSeriales(json.data || [])
      } catch (e) {
        console.error("[v0] error cargando seriales", e)
      } finally {
        if (!cancelled) setLoadingSeriales(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [detalle])

  // Apply local filters over the already-loaded serial list. Filter modes:
  //   "all"        -> everything
  //   "bodega"     -> ubicacion === "Bodega" AND estado Disponible/En_Bodega
  //   "<id>"       -> in that cuadrilla and not installed/defective
  //   "instalado"  -> estado Instalado/Cliente
  //   "defectuoso" -> estado Defectuoso/Dado_de_Baja
  const serialesFiltrados = useMemo(() => {
    const q = serialSearch.trim().toLowerCase()
    return seriales.filter((s: any) => {
      if (q && !String(s.numero_serie || "").toLowerCase().includes(q)) return false
      if (serialFilter === "all") return true
      if (serialFilter === "bodega") return s.ubicacion === "Bodega"
      if (serialFilter === "instalado")
        return ["Instalado", "Cliente"].includes(s.estado)
      if (serialFilter === "defectuoso")
        return ["Defectuoso", "Dado_de_Baja"].includes(s.estado)
      // numeric -> cuadrilla id
      const id = Number(serialFilter)
      if (Number.isFinite(id)) {
        return s.cuadrilla_id === id
      }
      return true
    })
  }, [seriales, serialSearch, serialFilter])
  // Bodega -> p.bodega. Cuadrilla X -> entry from p.por_cuadrilla matching the id.
  const stockEnUbicacion = (p: Producto): number => {
    if (ubicacionSel === "bodega") return p.bodega
    const id = Number(ubicacionSel)
    const entry = p.por_cuadrilla?.find((c) => c.cuadrilla_id === id)
    return entry?.cantidad ?? 0
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return productos
      .filter((p) => {
        if (filtroTipo !== "todos" && p.tipo !== filtroTipo) return false
        if (q && !p.nombre.toLowerCase().includes(q)) return false
        // Hide products that have zero stock at the selected ubicacion. The
        // user explicitly wants this view to behave like a real stock listing
        // ("solo lo que el almacen tiene") instead of a global catalog.
        if (stockEnUbicacion(p) <= 0) return false
        return true
      })
      // Sort by stock at the selected location (desc) so the operator sees
      // what's actually present first, then alphabetically as a tie-breaker.
      .sort((a, b) => {
        const diff = stockEnUbicacion(b) - stockEnUbicacion(a)
        if (diff !== 0) return diff
        return a.nombre.localeCompare(b.nombre)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos, search, filtroTipo, ubicacionSel])

  // Resumen of the currently selected ubicacion. Now that the listing only
  // shows products with stock>0, "Productos con stock" equals filtered.length;
  // we keep a "Total productos en catalogo" value to give context.
  const resumenUbicacion = useMemo(() => {
    let totalUnidades = 0
    for (const p of filtered) {
      totalUnidades += stockEnUbicacion(p)
    }
    // Universe of products that match search + tipo, regardless of stock.
    const q = search.trim().toLowerCase()
    const universeCount = productos.filter((p) => {
      if (filtroTipo !== "todos" && p.tipo !== filtroTipo) return false
      if (q && !p.nombre.toLowerCase().includes(q)) return false
      return true
    }).length
    return {
      totalUnidades: Number(totalUnidades.toFixed(2)),
      productosConStock: filtered.length,
      productosCatalogo: universeCount,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, ubicacionSel, productos, search, filtroTipo])

  const ubicacionLabel =
    ubicacionSel === "bodega"
      ? "Bodega Principal"
      : cuadrillas.find((c) => String(c.id) === ubicacionSel)?.nombre_cuadrilla ||
        "Cuadrilla"

  const handleCreateProducto = async () => {
    if (submittingRef.current) return
    if (!npNombre.trim()) {
      toast({ title: "Falta nombre", variant: "destructive" })
      return
    }

    // Validate optional initial stock BEFORE we touch the DB so a bad value
    // doesn't leave us with a freshly created product and a failed ingreso.
    const seriesList = npSeries
      .split(/[\n,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const cantNum = Number(npCantidad)
    const tieneCantidadInicial = npTipo === "Miscelaneo" && npCantidad.trim() !== ""
    if (tieneCantidadInicial && (!Number.isFinite(cantNum) || cantNum <= 0)) {
      toast({
        title: "Cantidad invalida",
        description: "La cantidad inicial debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    submittingRef.current = true
    setSavingNew(true)
    try {
      const res = await fetch("/api/inventario/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: npNombre.trim(),
          tipo: npTipo,
          unidad_medida: npUnidad.trim() || "Unidad",
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Error")

      const nuevoProducto = json.data
      let ingresoMsg: string | null = null

      // Auto-ingreso a Bodega: if the user provided seriales (serializado) or
      // a positive cantidad (miscelaneo) we hit /api/inventario/ingreso right
      // away so the kardex shows the inbound movement and stock is visible.
      if (npTipo === "Serializado" && seriesList.length > 0) {
        const ingRes = await fetch("/api/inventario/ingreso", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            producto_id: nuevoProducto.id,
            seriales: seriesList,
            origen_detalle: npOrigen.trim() || "Carga inicial",
            observaciones: "Ingreso automatico al crear producto",
          }),
        })
        const ingJson = await ingRes.json()
        if (!ingJson.success) {
          // Product was created but ingreso failed. Surface a clear message
          // so the operator knows to retry the ingreso manually.
          throw new Error(
            `Producto creado, pero fallo el ingreso de seriales: ${ingJson.error}`,
          )
        }
        ingresoMsg = `${ingJson.data.inserted} seriales agregados a Bodega`
      } else if (npTipo === "Miscelaneo" && tieneCantidadInicial) {
        const ingRes = await fetch("/api/inventario/ingreso", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            producto_id: nuevoProducto.id,
            cantidad: cantNum,
            origen_detalle: npOrigen.trim() || "Carga inicial",
            observaciones: "Ingreso automatico al crear producto",
          }),
        })
        const ingJson = await ingRes.json()
        if (!ingJson.success) {
          throw new Error(
            `Producto creado, pero fallo el ingreso inicial: ${ingJson.error}`,
          )
        }
        ingresoMsg = `${cantNum} ${npUnidad || "Unidad"} agregadas a Bodega`
      }

      toast({
        title: "Producto creado",
        description: ingresoMsg || "Sin stock inicial registrado",
      })
      setShowNew(false)
      setNpNombre("")
      setNpTipo("Serializado")
      setNpUnidad("Unidad")
      setNpSeries("")
      setNpCantidad("")
      setNpOrigen("")
      onChange()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      submittingRef.current = false
      setSavingNew(false)
    }
  }

  const handleIngreso = async () => {
    if (!ingresoProducto) return
    const isSerial = ingresoProducto.tipo === "Serializado"
    setSavingIngreso(true)
    try {
      const body: any = {
        producto_id: ingresoProducto.id,
        origen_detalle: origen.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
      }
      if (isSerial) {
        const list = seriesText
          .split(/[\n,;\s]+/)
          .map((s) => s.trim())
          .filter(Boolean)
        if (list.length === 0) throw new Error("Ingrese al menos un serial")
        body.seriales = list
      } else {
        const cant = Number(cantidad)
        if (!Number.isFinite(cant) || cant <= 0) {
          throw new Error("La cantidad debe ser mayor a 0")
        }
        body.cantidad = cant
      }
      const res = await fetch("/api/inventario/ingreso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Error")
      toast({
        title: "Ingreso registrado",
        description: isSerial
          ? `${json.data.inserted} seriales agregados`
          : `Stock actualizado`,
      })
      setShowIngreso(false)
      setSeriesText("")
      setCantidad("")
      setOrigen("")
      setObservaciones("")
      onChange()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setSavingIngreso(false)
    }
  }

  const isBodegaView = ubicacionSel === "bodega"

  // Toggles expansion of a product row. On open, fetch the seriales scoped to
  // the current ubicacion (Bodega / a specific cuadrilla) so the operator only
  // sees the units physically present at the selected almacen. State queried
  // is "Disponible" since instalados/defectuosos are not "in" the warehouse.
  const toggleExpand = async (p: Producto) => {
    if (p.tipo !== "Serializado") return
    const isOpen = expandedRows.has(p.id)
    const next = new Set(expandedRows)
    if (isOpen) {
      next.delete(p.id)
      setExpandedRows(next)
      return
    }
    next.add(p.id)
    setExpandedRows(next)

    const cacheKey = `${p.id}:${ubicacionSel}`
    if (serialesCache[cacheKey]) return // already loaded

    setLoadingRow((s) => ({ ...s, [p.id]: true }))
    try {
      const params = new URLSearchParams({
        producto_id: String(p.id),
        estado: "Disponible",
      })
      if (ubicacionSel === "bodega") {
        params.set("ubicacion", "Bodega")
      } else {
        params.set("ubicacion", "Cuadrilla")
        params.set("cuadrilla_id", ubicacionSel)
      }
      const res = await fetch(`/api/inventario/seriales?${params}`)
      const json = await res.json()
      if (json.success) {
        setSerialesCache((c) => ({ ...c, [cacheKey]: json.data || [] }))
      }
    } catch (e) {
      console.error("[v0] error cargando seriales inline", e)
    } finally {
      setLoadingRow((s) => {
        const copy = { ...s }
        delete copy[p.id]
        return copy
      })
    }
  }

  // Quick-pick chips for the location switcher. Bodega is always pinned
  // first; cuadrillas are sorted alphabetically.
  const ubicacionChips = useMemo(() => {
    const items: { value: string; label: string; sub?: string }[] = [
      { value: "bodega", label: "Bodega Principal", sub: "Almacen central" },
    ]
    const cuadrillasSorted = [...cuadrillas].sort((a, b) =>
      a.nombre_cuadrilla.localeCompare(b.nombre_cuadrilla),
    )
    for (const c of cuadrillasSorted) {
      items.push({
        value: String(c.id),
        label: c.nombre_cuadrilla,
        sub: "Cuadrilla",
      })
    }
    return items
  }, [cuadrillas])

  return (
    <div className="space-y-4">
      {/* Location switcher: a horizontal scroll row of cards. Easier to scan
          than a dropdown and makes "where am I looking" unmistakable. */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {ubicacionChips.map((chip) => {
          const active = ubicacionSel === chip.value
          const isBodega = chip.value === "bodega"
          return (
            <button
              key={chip.value}
              onClick={() => setUbicacionSel(chip.value)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors flex-shrink-0 ${
                active
                  ? isBodega
                    ? "border-orange-300 bg-orange-50 text-orange-900"
                    : "border-blue-300 bg-blue-50 text-blue-900"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div
                className={`rounded-md p-1.5 ${
                  isBodega
                    ? active
                      ? "bg-orange-100"
                      : "bg-orange-50"
                    : active
                      ? "bg-blue-100"
                      : "bg-blue-50"
                }`}
              >
                {isBodega ? (
                  <Warehouse
                    className={`w-4 h-4 ${active ? "text-orange-600" : "text-orange-500"}`}
                  />
                ) : (
                  <Users
                    className={`w-4 h-4 ${active ? "text-blue-600" : "text-blue-500"}`}
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight truncate max-w-[160px]">
                  {chip.label}
                </p>
                {chip.sub && (
                  <p className="text-[10px] uppercase tracking-wide opacity-70 leading-tight">
                    {chip.sub}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto en esta ubicacion..."
              className="pl-9"
            />
          </div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Serializado">Serializados</SelectItem>
              <SelectItem value="Miscelaneo">Miscelaneos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {/* Ingresos and product creation only happen at Bodega Principal.
              Cuadrillas can only receive stock through transferencias. */}
          {isBodegaView ? (
            <Button variant="outline" onClick={() => setShowNew(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => onGoToTransferencias?.()}
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Transferir a esta cuadrilla
            </Button>
          )}
        </div>
      </div>

      {/* Resumen por ubicacion */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          className={`rounded-lg border p-3 flex items-center gap-3 ${
            isBodegaView
              ? "border-orange-100 bg-orange-50/50"
              : "border-blue-100 bg-blue-50/50"
          }`}
        >
          <div
            className={`rounded-md p-2 ${
              isBodegaView ? "bg-orange-100" : "bg-blue-100"
            }`}
          >
            {isBodegaView ? (
              <Warehouse className="w-5 h-5 text-orange-600" />
            ) : (
              <Users className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <div className="min-w-0">
            <p
              className={`text-[11px] uppercase font-semibold tracking-wide ${
                isBodegaView ? "text-orange-700" : "text-blue-700"
              }`}
            >
              {isBodegaView ? "Almacen central" : "Cuadrilla"}
            </p>
            <p className="text-sm font-semibold text-gray-900 truncate">
              {ubicacionLabel}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-3">
          <p className="text-[11px] uppercase text-gray-500 font-semibold tracking-wide">
            Total de unidades
          </p>
          <p className="text-2xl font-semibold text-gray-900">
            {resumenUbicacion.totalUnidades}
          </p>
          <p className="text-[11px] text-gray-500">Stock fisico aqui</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-3">
          <p className="text-[11px] uppercase text-gray-500 font-semibold tracking-wide">
            Productos con existencia
          </p>
          <p className="text-2xl font-semibold text-gray-900">
            {resumenUbicacion.productosConStock}
            <span className="text-sm text-gray-400 font-normal">
              {" / "}
              {resumenUbicacion.productosCatalogo}
            </span>
          </p>
          <p className="text-[11px] text-gray-500">de catalogo total</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
          {isBodegaView ? (
            <>
              <Warehouse className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">
                Bodega Principal sin existencias
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Cree un producto o registre un ingreso para empezar.
              </p>
            </>
          ) : (
            <>
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">
                {ubicacionLabel} no tiene inventario asignado
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Las cuadrillas reciben stock unicamente por transferencias desde
                Bodega Principal.
              </p>
              {onGoToTransferencias && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={onGoToTransferencias}
                >
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  Ir a Transferencias
                </Button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Producto</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-right">
                  Stock en {isBodegaView ? "Bodega" : "Cuadrilla"}
                </th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const stockHere = stockEnUbicacion(p)
                const isSer = p.tipo === "Serializado"
                const isOpen = expandedRows.has(p.id)
                const cacheKey = `${p.id}:${ubicacionSel}`
                const rowSeriales = serialesCache[cacheKey]
                const rowLoading = !!loadingRow[p.id]
                return (
                  <Fragment key={p.id}>
                    <tr
                      className={`border-t border-gray-100 hover:bg-gray-50/50 ${
                        isSer ? "cursor-pointer" : ""
                      }`}
                      onClick={isSer ? () => toggleExpand(p) : undefined}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {isSer ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpand(p)
                              }}
                              className="rounded hover:bg-gray-100 p-0.5 transition-colors"
                              aria-label={isOpen ? "Colapsar" : "Expandir"}
                            >
                              {isOpen ? (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          ) : (
                            <span className="w-5" />
                          )}
                          {isSer ? (
                            <Hash className="w-4 h-4 text-orange-500" />
                          ) : (
                            <Boxes className="w-4 h-4 text-blue-500" />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDetalle(p)
                            }}
                            className="font-medium text-gray-900 hover:underline text-left"
                          >
                            {p.nombre}
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-500 ml-7">
                          {p.unidad_medida || "Unidad"}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className={
                            isSer
                              ? "border-orange-200 text-orange-700"
                              : "border-blue-200 text-blue-700"
                          }
                        >
                          {p.tipo}
                        </Badge>
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-semibold ${
                          stockHere > 0 ? "text-gray-900" : "text-gray-300"
                        }`}
                      >
                        {stockHere}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {/* Acciones por fila: la principal cambia segun la
                            ubicacion (Ingreso en Bodega vs Transferir en
                            cuadrillas), y siempre se muestran Editar y
                            Eliminar. Eliminar borra en cascada los seriales
                            y movimientos del kardex (ver API). */}
                        <div className="flex items-center justify-end gap-1">
                          {isBodegaView ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                setIngresoProducto(p)
                                setShowIngreso(true)
                              }}
                            >
                              <PackagePlus className="w-3.5 h-3.5 mr-1" />
                              Ingreso
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                onGoToTransferencias?.()
                              }}
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />
                              Transferir
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditProducto(p)
                            }}
                            aria-label="Editar producto"
                            title="Editar producto"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteProducto(p)
                            }}
                            aria-label="Eliminar producto"
                            title="Eliminar producto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isSer && isOpen && (
                      <tr className="bg-gray-50/70">
                        <td colSpan={4} className="px-3 py-3">
                          {rowLoading ? (
                            <div className="flex items-center gap-2 text-xs text-gray-500 px-2 py-3">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                              Cargando seriales...
                            </div>
                          ) : !rowSeriales || rowSeriales.length === 0 ? (
                            <div className="text-xs text-gray-500 px-2 py-3 italic">
                              Sin seriales disponibles en{" "}
                              {isBodegaView ? "Bodega" : ubicacionLabel}.
                            </div>
                          ) : (
                            <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                <span className="text-[11px] uppercase tracking-wide font-semibold text-gray-600">
                                  Seriales en {ubicacionLabel}
                                </span>
                                <span className="text-[11px] text-gray-500">
                                  {rowSeriales.length}{" "}
                                  {rowSeriales.length === 1 ? "unidad" : "unidades"}
                                </span>
                              </div>
                              <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                                {rowSeriales.map((s: any) => {
                                  const isEditing = editingSerialId === s.id
                                  return (
                                    <li
                                      key={s.id}
                                      className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm hover:bg-gray-50/60"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {isEditing ? (
                                        <Input
                                          autoFocus
                                          value={editingSerialValue}
                                          onChange={(e) =>
                                            setEditingSerialValue(e.target.value)
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") submitEditSerial(p.id)
                                            if (e.key === "Escape") cancelEditSerial()
                                          }}
                                          className="h-7 text-xs font-mono w-48"
                                        />
                                      ) : (
                                        <span className="font-mono text-xs text-gray-900">
                                          {s.numero_serie}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className="border-emerald-200 text-emerald-700 bg-emerald-50 text-[10px]"
                                        >
                                          {s.estado}
                                        </Badge>
                                        <span className="text-[11px] text-gray-500 hidden sm:inline">
                                          {s.fecha_ingreso
                                            ? new Date(
                                                s.fecha_ingreso,
                                              ).toLocaleDateString()
                                            : "-"}
                                        </span>
                                        {isEditing ? (
                                          <span className="flex items-center gap-0.5">
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6 text-emerald-600 hover:bg-emerald-50"
                                              disabled={savingSerial}
                                              onClick={() => submitEditSerial(p.id)}
                                              aria-label="Guardar"
                                              title="Guardar"
                                            >
                                              {savingSerial ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                              ) : (
                                                <Check className="w-3.5 h-3.5" />
                                              )}
                                            </Button>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6 text-gray-500 hover:bg-gray-100"
                                              onClick={cancelEditSerial}
                                              aria-label="Cancelar"
                                              title="Cancelar"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </Button>
                                          </span>
                                        ) : (
                                          <>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6"
                                              onClick={() => startEditSerial(s)}
                                              aria-label="Editar serial"
                                              title="Editar serial"
                                            >
                                              <Pencil className="w-3 h-3 text-gray-500" />
                                            </Button>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                                              onClick={() =>
                                                setDeleteSerial({
                                                  serial: s,
                                                  productoId: p.id,
                                                  productoNombre: p.nombre,
                                                })
                                              }
                                              aria-label="Eliminar serial"
                                              title="Eliminar serial"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </>
                                        )}
                                      </span>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New product modal */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-700 mb-1 block">Nombre</label>
              <Input
                value={npNombre}
                onChange={(e) => setNpNombre(e.target.value)}
                placeholder="ONU GPON XYZ"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-700 mb-1 block">Tipo</label>
                <Select
                  value={npTipo}
                  onValueChange={(v) => setNpTipo(v as "Serializado" | "Miscelaneo")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Serializado">Serializado</SelectItem>
                    <SelectItem value="Miscelaneo">Miscelaneo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-1 block">
                  Unidad de medida
                </label>
                <Input
                  value={npUnidad}
                  onChange={(e) => setNpUnidad(e.target.value)}
                  placeholder="Unidad / Metro / Caja"
                />
              </div>
            </div>
            {npTipo === "Serializado" && (
              <>
                <p className="text-xs text-gray-500">
                  Los productos serializados se controlan por numero de serie unico.
                </p>
                <div className="rounded-lg border border-orange-100 bg-orange-50/40 p-3 space-y-2">
                  <p className="text-xs font-semibold text-orange-700">
                    Stock inicial en Bodega (opcional)
                  </p>
                  <Textarea
                    rows={4}
                    value={npSeries}
                    onChange={(e) => setNpSeries(e.target.value)}
                    placeholder={"Ingrese seriales (uno por linea o separados por coma)\nSN0001\nSN0002"}
                    className="bg-white"
                  />
                  <p className="text-[11px] text-gray-500">
                    Si agrega seriales aqui se generara automaticamente un Ingreso a Bodega.
                  </p>
                </div>
              </>
            )}
            {npTipo === "Miscelaneo" && (
              <>
                <p className="text-xs text-gray-500">
                  Los productos miscelaneos se controlan por cantidad agregada.
                </p>
                <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-700">
                    Stock inicial en Bodega (opcional)
                  </p>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={npCantidad}
                    onChange={(e) => setNpCantidad(e.target.value)}
                    placeholder={`Cantidad en ${npUnidad || "Unidad"}`}
                    className="bg-white"
                  />
                  <p className="text-[11px] text-gray-500">
                    Si ingresa una cantidad se generara automaticamente un Ingreso a Bodega.
                  </p>
                </div>
              </>
            )}
            <div>
              <label className="text-sm text-gray-700 mb-1 block">
                Origen / Documento (opcional)
              </label>
              <Input
                value={npOrigen}
                onChange={(e) => setNpOrigen(e.target.value)}
                placeholder="Factura #1234, Carga inicial..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateProducto} disabled={savingNew}>
              {savingNew ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ingreso modal */}
      <Dialog open={showIngreso} onOpenChange={setShowIngreso}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Ingreso a Bodega {ingresoProducto ? `- ${ingresoProducto.nombre}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {ingresoProducto?.tipo === "Serializado" ? (
              <div>
                <label className="text-sm text-gray-700 mb-1 block">
                  Numeros de serie (uno por linea o separados por coma)
                </label>
                <Textarea
                  rows={6}
                  value={seriesText}
                  onChange={(e) => setSeriesText(e.target.value)}
                  placeholder={"SN0001\nSN0002\nSN0003"}
                />
              </div>
            ) : (
              <div>
                <label className="text-sm text-gray-700 mb-1 block">
                  Cantidad ({ingresoProducto?.unidad_medida || "Unidad"})
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="0"
                />
              </div>
            )}
            <div>
              <label className="text-sm text-gray-700 mb-1 block">
                Origen / Documento
              </label>
              <Input
                value={origen}
                onChange={(e) => setOrigen(e.target.value)}
                placeholder="Factura #1234, Compra Proveedor X"
              />
            </div>
            <div>
              <label className="text-sm text-gray-700 mb-1 block">Observaciones</label>
              <Textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIngreso(false)}>
              Cancelar
            </Button>
            <Button onClick={handleIngreso} disabled={savingIngreso}>
              {savingIngreso ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Registrar Ingreso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalle modal */}
      <Dialog open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detalle?.tipo === "Serializado" ? (
                <Hash className="w-4 h-4 text-orange-500" />
              ) : (
                <Boxes className="w-4 h-4 text-blue-500" />
              )}
              <span>Distribucion - {detalle?.nombre}</span>
            </DialogTitle>
          </DialogHeader>
          {detalle && (
            <div className="space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <Info label="Bodega" value={detalle.bodega} />
                <Info label="En Cuadrillas" value={detalle.en_cuadrillas} />
                <Info label="Instalado" value={detalle.instalado} />
                <Info label="Defectuoso" value={detalle.defectuoso} />
              </div>

              <div>
                <p className="text-xs uppercase text-gray-500 mb-2">Por cuadrilla</p>
                <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/50 p-2">
                  {detalle.por_cuadrilla.length === 0 && (
                    <p className="text-sm text-gray-500 px-1 py-0.5">
                      Sin cuadrillas con stock
                    </p>
                  )}
                  {detalle.por_cuadrilla.map((c) => (
                    <div
                      key={c.cuadrilla_id}
                      className="flex items-center justify-between border-b border-gray-100 last:border-b-0 py-1 px-1"
                    >
                      <span className="text-sm flex items-center gap-1">
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                        {c.nombre_cuadrilla}
                      </span>
                      <span className="text-sm font-semibold">{c.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-serial breakdown — only for Serializado products. */}
              {detalle.tipo === "Serializado" && (
                <div>
                  <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <p className="text-xs uppercase text-gray-500 font-semibold tracking-wide">
                      Detalle por serial ({serialesFiltrados.length}
                      {serialesFiltrados.length !== seriales.length
                        ? ` de ${seriales.length}`
                        : ""}
                      )
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <Input
                          value={serialSearch}
                          onChange={(e) => setSerialSearch(e.target.value)}
                          placeholder="Buscar serial..."
                          className="pl-8 h-8 text-sm w-44"
                        />
                      </div>
                      <Select value={serialFilter} onValueChange={setSerialFilter}>
                        <SelectTrigger className="h-8 text-sm w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las ubicaciones</SelectItem>
                          <SelectItem value="bodega">Bodega Principal</SelectItem>
                          {detalle.por_cuadrilla.map((c) => (
                            <SelectItem
                              key={c.cuadrilla_id}
                              value={String(c.cuadrilla_id)}
                            >
                              {c.nombre_cuadrilla}
                            </SelectItem>
                          ))}
                          <SelectItem value="instalado">Instalado</SelectItem>
                          <SelectItem value="defectuoso">Defectuoso/Baja</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {loadingSeriales ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                    </div>
                  ) : serialesFiltrados.length === 0 ? (
                    <div className="text-center py-6 text-sm text-gray-500 rounded-lg border border-dashed border-gray-200">
                      No hay seriales que coincidan con los filtros
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-100">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-[11px] uppercase">
                          <tr>
                            <th className="px-3 py-2 text-left">Serial</th>
                            <th className="px-3 py-2 text-left">Ubicacion</th>
                            <th className="px-3 py-2 text-left">Estado</th>
                            <th className="px-3 py-2 text-left hidden sm:table-cell">
                              Ingreso
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {serialesFiltrados.map((s: any) => {
                            const ubicacionLabel =
                              s.ubicacion === "Bodega"
                                ? "Bodega Principal"
                                : s.ubicacion === "Cuadrilla"
                                  ? s.cuadrilla?.nombre_cuadrilla
                                    ? `Cuadrilla: ${s.cuadrilla.nombre_cuadrilla}`
                                    : "Cuadrilla"
                                  : s.ubicacion || "—"
                            const isInstall = ["Instalado", "Cliente"].includes(
                              s.estado,
                            )
                            const isDefect = ["Defectuoso", "Dado_de_Baja"].includes(
                              s.estado,
                            )
                            const isBodega = s.ubicacion === "Bodega"
                            return (
                              <tr
                                key={s.id}
                                className="border-t border-gray-100 hover:bg-gray-50/40"
                              >
                                <td className="px-3 py-2 font-mono text-xs text-gray-900">
                                  {s.numero_serie}
                                </td>
                                <td className="px-3 py-2">
                                  <span className="inline-flex items-center gap-1 text-xs">
                                    {isBodega ? (
                                      <Warehouse className="w-3 h-3 text-orange-500" />
                                    ) : s.ubicacion === "Cuadrilla" ? (
                                      <Users className="w-3 h-3 text-blue-500" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 text-gray-400" />
                                    )}
                                    {ubicacionLabel}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <Badge
                                    variant="outline"
                                    className={
                                      isInstall
                                        ? "border-green-200 text-green-700 bg-green-50"
                                        : isDefect
                                          ? "border-red-200 text-red-700 bg-red-50"
                                          : isBodega
                                            ? "border-orange-200 text-orange-700 bg-orange-50"
                                            : "border-blue-200 text-blue-700 bg-blue-50"
                                    }
                                  >
                                    {s.estado}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-500 hidden sm:table-cell">
                                  {s.fecha_ingreso
                                    ? new Date(s.fecha_ingreso).toLocaleDateString()
                                    : "—"}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit product modal */}
      <Dialog
        open={!!editProducto}
        onOpenChange={(o) => !o && !savingEdit && setEditProducto(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
          </DialogHeader>
          {editProducto && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Nombre</label>
                <Input
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  placeholder="Nombre del producto"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Unidad de medida
                </label>
                <Input
                  value={editUnidad}
                  onChange={(e) => setEditUnidad(e.target.value)}
                  placeholder="Unidad"
                />
              </div>
              <div className="rounded-md bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
                Tipo:{" "}
                <span className="font-semibold text-gray-700">
                  {editProducto.tipo}
                </span>{" "}
                (no editable)
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditProducto(null)}
              disabled={savingEdit}
            >
              Cancelar
            </Button>
            <Button onClick={submitEditProducto} disabled={savingEdit}>
              {savingEdit && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete single-serial confirmation */}
      <Dialog
        open={!!deleteSerial}
        onOpenChange={(o) => !o && !deletingSerial && setDeleteSerial(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="w-4 h-4" /> Eliminar serial
            </DialogTitle>
          </DialogHeader>
          {deleteSerial && (
            <div className="space-y-3 text-sm">
              <p>
                Vas a eliminar el serial{" "}
                <span className="font-mono font-semibold">
                  {deleteSerial.serial.numero_serie}
                </span>{" "}
                de <span className="font-semibold">{deleteSerial.productoNombre}</span>.
              </p>
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800 space-y-1">
                <p className="font-semibold">Esta accion es irreversible y borrara:</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li>El serial del inventario</li>
                  <li>Todos sus movimientos en el kardex</li>
                </ul>
                <p className="pt-1">
                  El producto y sus demas seriales no se veran afectados.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteSerial(null)}
              disabled={deletingSerial}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={submitDeleteSerial}
              disabled={deletingSerial}
            >
              {deletingSerial && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar serial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteProducto}
        onOpenChange={(o) => !o && !deleting && setDeleteProducto(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="w-4 h-4" /> Eliminar producto
            </DialogTitle>
          </DialogHeader>
          {deleteProducto && (
            <div className="space-y-3 text-sm">
              <p>
                Vas a eliminar el producto{" "}
                <span className="font-semibold">{deleteProducto.nombre}</span>.
              </p>
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800 space-y-1">
                <p className="font-semibold">Esta accion es irreversible y borrara:</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li>El producto del catalogo</li>
                  <li>Todos sus seriales (en bodega y cuadrillas)</li>
                  <li>
                    <span className="font-semibold">Todos</span> los movimientos de
                    inventario asociados (kardex)
                  </li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteProducto(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={submitDeleteProducto}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Info({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-[11px] uppercase text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}
