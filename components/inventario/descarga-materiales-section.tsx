"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2, Package, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Materials descargue (consumption) section, embedded in step 2 of the
// technician's installation wizard. The user picks items from the
// cuadrilla's current stock and sets the quantity used on this install.
//
// On the first edit it loads `/api/inventario/mi-stock` and exposes the
// resulting selection via `value`/`onChange` so the parent can include it
// in the final POST. The actual stock decrement happens at finish-time
// via /api/inventario/descarga; this section is purely a picker.

export interface DescargaItem {
  producto_id: number
  nombre: string
  unidad_medida: string
  tipo: "Serializado" | "Miscelaneo"
  // For serializado: an item per serial. For miscelaneo: cantidad agregada.
  cantidad: number
  // Only for serializado items — id from inventario_serializado.
  serial_id?: number
  serial_codigo?: string
  // Stock cap so we can validate against what's available in the cuadrilla.
  disponible: number
}

interface MiStockProducto {
  producto_id: number
  nombre: string
  tipo: "Serializado" | "Miscelaneo"
  unidad_medida: string
  cantidad: number
  seriales?: Array<{ id: number; codigo_serial: string }>
}

interface Props {
  cuadrillaId: number | null
  value: DescargaItem[]
  onChange: (items: DescargaItem[]) => void
}

export function DescargaMaterialesSection({ cuadrillaId, value, onChange }: Props) {
  const [stock, setStock] = useState<MiStockProducto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Local form for adding a new item to the descargue list.
  const [selectedProductoId, setSelectedProductoId] = useState<string>("")
  const [selectedSerialId, setSelectedSerialId] = useState<string>("")
  const [cantidad, setCantidad] = useState<string>("1")

  useEffect(() => {
    if (!cuadrillaId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/inventario/mi-stock?cuadrilla_id=${cuadrillaId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (!data?.success) {
          setError(data?.error || "No se pudo cargar el inventario")
          return
        }
        // The API returns { data: { seriales, miscelaneo } } where each row
        // already carries its `producto` joined from catalogo_productos. We
        // collapse those two flat lists into a single grouped-by-product
        // structure so the picker can show one row per producto with the
        // serial dropdown and/or remaining quantity.
        const seriales: any[] = data.data?.seriales || []
        const miscelaneo: any[] = data.data?.miscelaneo || []

        const byProducto = new Map<number, MiStockProducto>()

        for (const s of seriales) {
          if (!s.producto) continue
          const key = s.producto_id
          if (!byProducto.has(key)) {
            byProducto.set(key, {
              producto_id: key,
              nombre: s.producto.nombre,
              tipo: "Serializado",
              unidad_medida: s.producto.unidad_medida || "Unidad",
              cantidad: 0,
              seriales: [],
            })
          }
          const entry = byProducto.get(key)!
          entry.seriales!.push({ id: s.id, codigo_serial: s.numero_serie })
          entry.cantidad = entry.seriales!.length
        }

        for (const m of miscelaneo) {
          if (!m.producto) continue
          const key = m.producto_id
          // A misc bucket can have multiple rows per producto if it was
          // loaded via different transactions — sum them so the cap matches
          // what the user really has available.
          const prev = byProducto.get(key)
          if (prev && prev.tipo === "Miscelaneo") {
            prev.cantidad += Number(m.cantidad) || 0
          } else {
            byProducto.set(key, {
              producto_id: key,
              nombre: m.producto.nombre,
              tipo: "Miscelaneo",
              unidad_medida: m.producto.unidad_medida || "Unidad",
              cantidad: Number(m.cantidad) || 0,
            })
          }
        }

        setStock(
          Array.from(byProducto.values()).sort((a, b) =>
            a.nombre.localeCompare(b.nombre),
          ),
        )
      })
      .catch((e) => !cancelled && setError(e.message || "Error de red"))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [cuadrillaId])

  const selectedProducto = useMemo(
    () => stock.find((p) => String(p.producto_id) === selectedProductoId),
    [stock, selectedProductoId],
  )

  // Prevent re-selecting the same serial twice in this descargue.
  const usedSerialIds = useMemo(
    () => new Set(value.filter((i) => i.serial_id).map((i) => i.serial_id)),
    [value],
  )

  const handleAdd = () => {
    if (!selectedProducto) return

    if (selectedProducto.tipo === "Serializado") {
      const serial = selectedProducto.seriales?.find(
        (s) => String(s.id) === selectedSerialId,
      )
      if (!serial) return
      onChange([
        ...value,
        {
          producto_id: selectedProducto.producto_id,
          nombre: selectedProducto.nombre,
          unidad_medida: selectedProducto.unidad_medida,
          tipo: "Serializado",
          cantidad: 1,
          serial_id: serial.id,
          serial_codigo: serial.codigo_serial,
          disponible: 1,
        },
      ])
      setSelectedSerialId("")
    } else {
      const num = Number(cantidad)
      if (!Number.isFinite(num) || num <= 0) return
      // Subtract anything already added for the same producto so we don't
      // double-count when validating against `cantidad` in stock.
      const yaUsado = value
        .filter((i) => i.producto_id === selectedProducto.producto_id && i.tipo === "Miscelaneo")
        .reduce((acc, i) => acc + i.cantidad, 0)
      if (num + yaUsado > selectedProducto.cantidad) {
        setError(
          `Solo hay ${selectedProducto.cantidad} ${selectedProducto.unidad_medida} disponibles (ya agregaste ${yaUsado})`,
        )
        return
      }
      onChange([
        ...value,
        {
          producto_id: selectedProducto.producto_id,
          nombre: selectedProducto.nombre,
          unidad_medida: selectedProducto.unidad_medida,
          tipo: "Miscelaneo",
          cantidad: num,
          disponible: selectedProducto.cantidad,
        },
      ])
      setCantidad("1")
    }

    setSelectedProductoId("")
    setError(null)
  }

  const handleRemove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  if (!cuadrillaId) {
    return (
      <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-3">
        Selecciona una cuadrilla para ver el inventario disponible.
      </div>
    )
  }

  return (
    <div className="space-y-3 border border-gray-200 rounded-xl p-3 bg-gray-50">
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-orange-600" />
        <h3 className="font-semibold text-sm text-gray-900">Descargue de Materiales</h3>
      </div>

      <p className="text-[11px] text-gray-600 -mt-2">
        Agrega los equipos y materiales utilizados en esta instalación. Se descontarán del inventario de
        tu cuadrilla al finalizar.
      </p>

      {/* List of items already added */}
      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map((item, idx) => (
            <div
              key={`${item.producto_id}-${item.serial_id ?? idx}`}
              className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg p-2"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-900 truncate">
                  {item.nombre}
                </div>
                <div className="text-[11px] text-gray-600">
                  {item.tipo === "Serializado" ? (
                    <>Serie: <span className="font-mono">{item.serial_codigo}</span></>
                  ) : (
                    <>{item.cantidad} {item.unidad_medida}</>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemove(idx)}
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                aria-label="Quitar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Picker */}
      {loading ? (
        <div className="flex items-center justify-center py-3 text-xs text-gray-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
          Cargando inventario...
        </div>
      ) : stock.length === 0 ? (
        <div className="text-xs text-gray-500 bg-white border border-gray-200 rounded p-2.5 text-center">
          La cuadrilla no tiene inventario asignado.
        </div>
      ) : (
        <div className="space-y-2 bg-white border border-gray-200 rounded-lg p-2.5">
          <div>
            <label className="text-[11px] font-semibold text-gray-700 block mb-1">
              Producto
            </label>
            <select
              value={selectedProductoId}
              onChange={(e) => {
                setSelectedProductoId(e.target.value)
                setSelectedSerialId("")
                setCantidad("1")
                setError(null)
              }}
              className="w-full text-xs border border-gray-300 rounded-md p-2 bg-white"
            >
              <option value="">-- Selecciona un producto --</option>
              {stock.map((p) => (
                <option
                  key={p.producto_id}
                  value={p.producto_id}
                  disabled={
                    p.tipo === "Serializado"
                      ? !p.seriales?.some((s) => !usedSerialIds.has(s.id))
                      : p.cantidad <= 0
                  }
                >
                  {p.nombre} ({p.tipo === "Serializado" ? `${p.seriales?.length || 0} seriales` : `${p.cantidad} ${p.unidad_medida}`})
                </option>
              ))}
            </select>
          </div>

          {selectedProducto?.tipo === "Serializado" && (
            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                Serie disponible
              </label>
              <select
                value={selectedSerialId}
                onChange={(e) => setSelectedSerialId(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-md p-2 bg-white font-mono"
              >
                <option value="">-- Selecciona un serial --</option>
                {selectedProducto.seriales
                  ?.filter((s) => !usedSerialIds.has(s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.codigo_serial}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {selectedProducto?.tipo === "Miscelaneo" && (
            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                Cantidad ({selectedProducto.unidad_medida})
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="text-xs h-8"
              />
              <div className="text-[10px] text-gray-500 mt-0.5">
                Disponible: {selectedProducto.cantidad} {selectedProducto.unidad_medida}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-1.5 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded p-1.5">
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleAdd}
            disabled={
              !selectedProducto ||
              (selectedProducto.tipo === "Serializado" && !selectedSerialId) ||
              (selectedProducto.tipo === "Miscelaneo" && (!cantidad || Number(cantidad) <= 0))
            }
            className="w-full h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Agregar al descargue
          </Button>
        </div>
      )}
    </div>
  )
}
