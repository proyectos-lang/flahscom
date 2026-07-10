"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, ArrowRight, ArrowLeft, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ProductoOpt {
  id: number
  nombre: string
  tipo: string
  unidad_medida: string | null
}

interface CuadrillaOpt {
  id: number
  nombre_cuadrilla: string
}

interface SerialRow {
  id: number
  numero_serie: string
  ubicacion: string
  estado: string
  cuadrilla_id: number | null
  producto: { nombre: string } | null
}

export function TransferenciasTab({
  refreshKey,
  onChange,
}: {
  refreshKey: number
  onChange: () => void
}) {
  const { toast } = useToast()
  const [direccion, setDireccion] = useState<
    "Bodega_A_Cuadrilla" | "Cuadrilla_A_Bodega" | "Cuadrilla_A_Cuadrilla"
  >("Bodega_A_Cuadrilla")
  const [productos, setProductos] = useState<ProductoOpt[]>([])
  const [cuadrillas, setCuadrillas] = useState<CuadrillaOpt[]>([])
  const [productoId, setProductoId] = useState<string>("")
  const [cuadrillaId, setCuadrillaId] = useState<string>("")
  const [cuadrillaDestinoId, setCuadrillaDestinoId] = useState<string>("")
  const isC2C = direccion === "Cuadrilla_A_Cuadrilla"
  const [seriales, setSeriales] = useState<SerialRow[]>([])
  const [seleccionados, setSeleccionados] = useState<Record<number, boolean>>({})
  const [searchSerial, setSearchSerial] = useState("")
  const [cantidad, setCantidad] = useState("")
  const [stockDisponible, setStockDisponible] = useState<number | null>(null)
  const [observaciones, setObservaciones] = useState("")
  const [loadingSeriales, setLoadingSeriales] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const productoSel = useMemo(
    () => productos.find((p) => String(p.id) === productoId),
    [productos, productoId],
  )
  const isSerial = productoSel?.tipo === "Serializado"

  // Load productos + cuadrillas once
  useEffect(() => {
    ;(async () => {
      const [pRes, cRes] = await Promise.all([
        fetch("/api/inventario/productos").then((r) => r.json()),
        fetch("/api/cuadrillas?activa=true").then((r) => r.json()),
      ])
      if (pRes.success) setProductos(pRes.data)
      if (cRes.success) setCuadrillas(cRes.data)
    })()
  }, [])

  // Load seriales / available misc qty when filters change
  useEffect(() => {
    setSeleccionados({})
    if (!productoId || !productoSel) {
      setSeriales([])
      setStockDisponible(null)
      return
    }

    if (isSerial) {
      const params = new URLSearchParams()
      params.set("producto_id", productoId)
      params.set("estado", "Disponible")
      if (direccion === "Bodega_A_Cuadrilla") {
        params.set("ubicacion", "Bodega")
      } else {
        params.set("ubicacion", "Cuadrilla")
        if (cuadrillaId) params.set("cuadrilla_id", cuadrillaId)
      }
      setLoadingSeriales(true)
      fetch(`/api/inventario/seriales?${params}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.success) setSeriales(j.data)
        })
        .finally(() => setLoadingSeriales(false))
      setStockDisponible(null)
    } else {
      // Miscelaneo: derive available qty from /api/inventario/stock
      setSeriales([])
      fetch("/api/inventario/stock")
        .then((r) => r.json())
        .then((j) => {
          if (!j.success) return
          const p = j.data.productos.find(
            (x: any) => String(x.id) === productoId,
          )
          if (!p) return setStockDisponible(0)
          if (direccion === "Bodega_A_Cuadrilla") {
            setStockDisponible(p.bodega)
          } else if (cuadrillaId) {
            const row = p.por_cuadrilla.find(
              (c: any) => String(c.cuadrilla_id) === cuadrillaId,
            )
            setStockDisponible(row ? row.cantidad : 0)
          } else {
            setStockDisponible(null)
          }
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId, direccion, cuadrillaId, refreshKey])

  const filteredSeriales = useMemo(() => {
    const q = searchSerial.trim().toLowerCase()
    if (!q) return seriales
    return seriales.filter((s) => s.numero_serie.toLowerCase().includes(q))
  }, [seriales, searchSerial])

  const totalSeleccionados = Object.values(seleccionados).filter(Boolean).length

  const handleSubmit = async () => {
    if (!productoId || !cuadrillaId) {
      toast({ title: "Selecciona producto y cuadrilla", variant: "destructive" })
      return
    }
    if (isC2C && !cuadrillaDestinoId) {
      toast({ title: "Selecciona la cuadrilla de destino", variant: "destructive" })
      return
    }
    if (isC2C && cuadrillaDestinoId === cuadrillaId) {
      toast({
        title: "La cuadrilla de origen y destino deben ser diferentes",
        variant: "destructive",
      })
      return
    }
    setSubmitting(true)
    try {
      const body: any = {
        direccion,
        producto_id: Number(productoId),
        cuadrilla_id: Number(cuadrillaId),
        observaciones: observaciones.trim() || undefined,
      }
      if (isC2C) {
        body.cuadrilla_destino_id = Number(cuadrillaDestinoId)
      }
      if (isSerial) {
        const ids = Object.entries(seleccionados)
          .filter(([, v]) => v)
          .map(([k]) => Number(k))
        if (ids.length === 0) throw new Error("Selecciona al menos un serial")
        body.serial_ids = ids
      } else {
        const cant = Number(cantidad)
        if (!Number.isFinite(cant) || cant <= 0) {
          throw new Error("Cantidad invalida")
        }
        body.cantidad = cant
      }
      const res = await fetch("/api/inventario/transferencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Error")
      toast({
        title: "Transferencia registrada",
        description: isSerial
          ? `${json.data.count} seriales movidos`
          : `${json.data.count} unidades movidas`,
      })
      setSeleccionados({})
      setCantidad("")
      setObservaciones("")
      onChange()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Direction toggle */}
      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        <span className="text-sm text-gray-600">Movimiento:</span>
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            onClick={() => setDireccion("Bodega_A_Cuadrilla")}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 ${
              direccion === "Bodega_A_Cuadrilla"
                ? "bg-white shadow-sm font-semibold"
                : "text-gray-600"
            }`}
          >
            Bodega <ArrowRight className="w-3.5 h-3.5" /> Cuadrilla
          </button>
          <button
            onClick={() => setDireccion("Cuadrilla_A_Bodega")}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 ${
              direccion === "Cuadrilla_A_Bodega"
                ? "bg-white shadow-sm font-semibold"
                : "text-gray-600"
            }`}
          >
            Cuadrilla <ArrowLeft className="w-3.5 h-3.5" /> Bodega
          </button>
          <button
            onClick={() => setDireccion("Cuadrilla_A_Cuadrilla")}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 ${
              direccion === "Cuadrilla_A_Cuadrilla"
                ? "bg-white shadow-sm font-semibold"
                : "text-gray-600"
            }`}
          >
            Cuadrilla <ArrowRight className="w-3.5 h-3.5" /> Cuadrilla
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-gray-700 mb-1 block">Producto</label>
          <Select value={productoId} onValueChange={setProductoId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar producto" />
            </SelectTrigger>
            <SelectContent>
              {productos.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.nombre}{" "}
                  <span className="text-xs text-gray-500">({p.tipo})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-gray-700 mb-1 block">
            {isC2C ? "Cuadrilla Origen" : "Cuadrilla"}
          </label>
          <Select value={cuadrillaId} onValueChange={setCuadrillaId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar cuadrilla" />
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
        {isC2C && (
          <div>
            <label className="text-sm text-gray-700 mb-1 block">Cuadrilla Destino</label>
            <Select value={cuadrillaDestinoId} onValueChange={setCuadrillaDestinoId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cuadrilla" />
              </SelectTrigger>
              <SelectContent>
                {cuadrillas
                  .filter((c) => String(c.id) !== cuadrillaId)
                  .map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre_cuadrilla}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Serial picker or qty input */}
      {productoSel && isSerial && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              Seleccionar seriales{" "}
              <span className="text-gray-500">
                ({totalSeleccionados} de {filteredSeriales.length} disponibles)
              </span>
            </p>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchSerial}
                onChange={(e) => setSearchSerial(e.target.value)}
                placeholder="Buscar serie..."
                className="pl-9 h-8"
              />
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 max-h-72 overflow-y-auto">
            {loadingSeriales ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              </div>
            ) : filteredSeriales.length === 0 ? (
              <p className="text-center py-6 text-sm text-gray-500">
                Sin seriales disponibles para el filtro actual.
              </p>
            ) : (
              filteredSeriales.map((s) => {
                const checked = !!seleccionados[s.id]
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 px-3 py-2 border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        setSeleccionados((prev) => ({ ...prev, [s.id]: !!v }))
                      }
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {s.numero_serie}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {s.ubicacion} · {s.estado}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      ID #{s.id}
                    </Badge>
                  </label>
                )
              })
            )}
          </div>
        </div>
      )}

      {productoSel && !isSerial && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <div>
            <label className="text-sm text-gray-700 mb-1 block">
              Cantidad ({productoSel.unidad_medida || "Unidad"})
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
          {stockDisponible !== null && (
            <p className="text-sm text-gray-600">
              Stock disponible:{" "}
              <span className="font-semibold">{stockDisponible}</span>
            </p>
          )}
        </div>
      )}

      <div>
        <label className="text-sm text-gray-700 mb-1 block">Observaciones</label>
        <Textarea
          rows={2}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Opcional"
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={submitting || !productoId || !cuadrillaId || (isC2C && !cuadrillaDestinoId)}
        >
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Registrar Transferencia
        </Button>
      </div>
    </div>
  )
}
