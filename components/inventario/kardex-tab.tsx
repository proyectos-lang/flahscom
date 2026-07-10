"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { exportToExcel } from "@/lib/export-excel"
import { Loader2, History, Warehouse, Users, FileSpreadsheet } from "lucide-react"

interface KardexRow {
  id: number
  tipo_movimiento: string
  cantidad: number
  origen_detalle: string | null
  destino_detalle: string | null
  contrato_id: number | null
  usuario_registro: string | null
  fecha: string
  observaciones: string | null
  producto: { nombre: string; tipo: string; unidad_medida: string | null } | null
  cuadrilla: { nombre_cuadrilla: string } | null
  serial: { numero_serie: string } | null
}

interface CuadrillaInfo {
  id: number
  nombre_cuadrilla: string
}

const TIPO_LABEL: Record<string, string> = {
  Ingreso_Bodega: "Ingreso a Bodega",
  Transferencia_Cuadrilla: "Transferencia a Cuadrilla",
  Descarga_Instalacion: "Descarga en Instalacion",
  Retorno_Bodega: "Retorno a Bodega",
}

const TIPO_COLOR: Record<string, string> = {
  Ingreso_Bodega: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Transferencia_Cuadrilla: "bg-orange-50 text-orange-700 border-orange-200",
  Descarga_Instalacion: "bg-blue-50 text-blue-700 border-blue-200",
  Retorno_Bodega: "bg-amber-50 text-amber-700 border-amber-200",
}

export function KardexTab({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<KardexRow[]>([])
  const [cuadrillas, setCuadrillas] = useState<CuadrillaInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [tipo, setTipo] = useState("todos")
  // "all" | "bodega" | "<cuadrilla_id>" — selector at the top of the kardex
  // that scopes the listing to the movements involving that location only.
  const [ubicacion, setUbicacion] = useState("all")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")

  // Pull the list of cuadrillas from the existing stock endpoint so we don't
  // need to spin up a new API just to populate the select.
  useEffect(() => {
    fetch("/api/inventario/stock")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setCuadrillas(j.data?.cuadrillas || [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, desde, hasta, ubicacion, refreshKey])

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (tipo !== "todos") params.set("tipo_movimiento", tipo)
      if (ubicacion === "bodega") {
        params.set("ubicacion", "bodega")
      } else if (ubicacion !== "all") {
        // numeric -> cuadrilla_id
        params.set("cuadrilla_id", ubicacion)
      }
      if (desde) params.set("desde", new Date(desde).toISOString())
      if (hasta) {
        const d = new Date(hasta)
        d.setHours(23, 59, 59, 999)
        params.set("hasta", d.toISOString())
      }
      const res = await fetch(`/api/inventario/kardex?${params}`)
      const json = await res.json()
      if (json.success) setRows(json.data)
    } finally {
      setLoading(false)
    }
  }

  const ubicacionLabel = useMemo(() => {
    if (ubicacion === "all") return "Todas las ubicaciones"
    if (ubicacion === "bodega") return "Bodega Principal"
    const c = cuadrillas.find((x) => String(x.id) === ubicacion)
    return c ? `Cuadrilla: ${c.nombre_cuadrilla}` : "Cuadrilla"
  }, [ubicacion, cuadrillas])

  // Exports the currently filtered rows to a real .xlsx workbook.
  // We export exactly what is on screen (same filters: tipo, ubicacion, fechas)
  // so the download always matches the visible Historial.
  const exportarExcel = () => {
    if (rows.length === 0) return

    const headers = [
      "Fecha",
      "Tipo",
      "Producto",
      "Tipo Producto",
      "Unidad",
      "Serial",
      "Cantidad",
      "Origen",
      "Destino",
      "Cuadrilla",
      "Contrato",
      "Usuario",
      "Observaciones",
    ]

    const dataRows = rows.map((r) => [
      new Date(r.fecha).toLocaleString(),
      TIPO_LABEL[r.tipo_movimiento] || r.tipo_movimiento,
      r.producto?.nombre || "",
      r.producto?.tipo || "",
      r.producto?.unidad_medida || "",
      r.serial?.numero_serie || "",
      r.cantidad,
      r.origen_detalle || "",
      r.destino_detalle || "",
      r.cuadrilla?.nombre_cuadrilla || "",
      r.contrato_id || "",
      r.usuario_registro || "",
      r.observaciones || "",
    ])

    const stamp = new Date().toISOString().slice(0, 10)
    exportToExcel({
      filename: `historial-inventario-${stamp}`,
      sheetName: "Historial",
      headers,
      rows: dataRows,
    })
  }

  const isBodega = ubicacion === "bodega"
  const isCuadrilla = ubicacion !== "all" && ubicacion !== "bodega"

  return (
    <div className="space-y-4">
      {/* Location switcher chips. Same pattern as the Catalogo tab so the
          operator gets a consistent way to scope the view across modules. */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setUbicacion("all")}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors flex-shrink-0 ${
            ubicacion === "all"
              ? "border-gray-300 bg-gray-100 text-gray-900"
              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          <div className="rounded-md bg-gray-200 p-1.5">
            <History className="w-4 h-4 text-gray-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">Todas</p>
            <p className="text-[10px] uppercase tracking-wide opacity-70 leading-tight">
              Movimientos
            </p>
          </div>
        </button>
        <button
          onClick={() => setUbicacion("bodega")}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors flex-shrink-0 ${
            isBodega
              ? "border-orange-300 bg-orange-50 text-orange-900"
              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          <div className={`rounded-md p-1.5 ${isBodega ? "bg-orange-100" : "bg-orange-50"}`}>
            <Warehouse className={`w-4 h-4 ${isBodega ? "text-orange-600" : "text-orange-500"}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">Bodega Principal</p>
            <p className="text-[10px] uppercase tracking-wide opacity-70 leading-tight">
              Almacen central
            </p>
          </div>
        </button>
        {[...cuadrillas]
          .sort((a, b) => a.nombre_cuadrilla.localeCompare(b.nombre_cuadrilla))
          .map((c) => {
            const active = ubicacion === String(c.id)
            return (
              <button
                key={c.id}
                onClick={() => setUbicacion(String(c.id))}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors flex-shrink-0 ${
                  active
                    ? "border-blue-300 bg-blue-50 text-blue-900"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className={`rounded-md p-1.5 ${active ? "bg-blue-100" : "bg-blue-50"}`}>
                  <Users className={`w-4 h-4 ${active ? "text-blue-600" : "text-blue-500"}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate max-w-[160px]">
                    {c.nombre_cuadrilla}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide opacity-70 leading-tight">
                    Cuadrilla
                  </p>
                </div>
              </button>
            )
          })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Tipo</label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Ingreso_Bodega">Ingreso a Bodega</SelectItem>
              <SelectItem value="Transferencia_Cuadrilla">
                Transferencia a Cuadrilla
              </SelectItem>
              <SelectItem value="Descarga_Instalacion">
                Descarga en Instalacion
              </SelectItem>
              <SelectItem value="Retorno_Bodega">Retorno a Bodega</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Desde</label>
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Hasta</label>
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          {rows.length} movimiento{rows.length === 1 ? "" : "s"} - {ubicacionLabel}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={exportarExcel}
          disabled={loading || rows.length === 0}
          className="gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 bg-transparent"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Exportar a Excel
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <History className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm">
            Sin movimientos en {ubicacionLabel.toLowerCase()} para los filtros
            seleccionados.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Producto</th>
                <th className="px-3 py-2 text-left">Serial</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2 text-left">Origen</th>
                <th className="px-3 py-2 text-left">Destino</th>
                {/* When the operator already selected a single cuadrilla, the
                    Cuadrilla column is redundant — hide it to reduce noise. */}
                {!isCuadrilla && (
                  <th className="px-3 py-2 text-left">Cuadrilla</th>
                )}
                <th className="px-3 py-2 text-left">Contrato</th>
                <th className="px-3 py-2 text-left">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(r.fecha).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant="outline"
                      className={TIPO_COLOR[r.tipo_movimiento] || ""}
                    >
                      {TIPO_LABEL[r.tipo_movimiento] || r.tipo_movimiento}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    {r.producto?.nombre || "-"}
                    {r.producto?.tipo && (
                      <p className="text-[11px] text-gray-500">{r.producto.tipo}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {r.serial?.numero_serie || "-"}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {r.cantidad}
                  </td>
                  <td className="px-3 py-2">{r.origen_detalle || "-"}</td>
                  <td className="px-3 py-2">{r.destino_detalle || "-"}</td>
                  {!isCuadrilla && (
                    <td className="px-3 py-2">
                      {r.cuadrilla?.nombre_cuadrilla || "-"}
                    </td>
                  )}
                  <td className="px-3 py-2">{r.contrato_id || "-"}</td>
                  <td className="px-3 py-2">{r.usuario_registro || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
