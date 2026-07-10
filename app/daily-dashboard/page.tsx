"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { exportToExcel } from "@/lib/export-excel"
import { ShoppingCart, DollarSign, Calendar, Search, Download, TrendingUp, Users, Package } from "lucide-react"

interface DailyStats {
  date: string
  ventas: {
    cantidad: number
    total?: number
    datos: any[]
  }
  pagos: {
    cantidad: number
    total: number
    datos: any[]
  }
}

interface AggRow {
  nombre: string
  cantidad: number
  valor: number
}

interface SalesAnalysis {
  date: string
  month: string
  totalContratosMes: number
  vendedores: {
    dia: AggRow[]
    mes: AggRow[]
    totalesDia: { cantidad: number; valor: number }
    totalesMes: { cantidad: number; valor: number }
  }
  paquetes: {
    dia: AggRow[]
    mes: AggRow[]
    totalesDia: { cantidad: number; valor: number }
    totalesMes: { cantidad: number; valor: number }
  }
}

type ViewMode = "daily" | "monthly" | "analysis"

export default function DailyDashboardPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("daily")
  const getHondurasDateString = () => {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Tegucigalpa" }) // returns YYYY-MM-DD
  }
  const getHondurasMonthString = () => {
    return getHondurasDateString().slice(0, 7) // returns YYYY-MM
  }

  const [selectedDate, setSelectedDate] = useState<string>(getHondurasDateString())
  const [selectedMonth, setSelectedMonth] = useState<string>(getHondurasMonthString())
  const [stats, setStats] = useState<DailyStats | null>(null)
  const [analysis, setAnalysis] = useState<SalesAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const loadDailyStats = async (dateToLoad?: string) => {
    setLoading(true)
    setError(null)
    const dateParam = viewMode === "daily" ? (dateToLoad || selectedDate) : selectedMonth
    try {
      console.log("[v0] Loading stats for:", dateParam, "mode:", viewMode)
      const response = await fetch(`/api/daily-dashboard?date=${dateParam}&mode=${viewMode}`)
      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`API error: ${errorData}`)
      }
      const data = await response.json()
      setStats(data)
      setHasSearched(true)
      console.log("[v0] Stats loaded:", data)
    } catch (error: any) {
      const errorMessage = error.message || "Error desconocido"
      console.error("[v0] Error loading stats:", errorMessage)
      setError(errorMessage)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  // Analysis mode uses a full date (YYYY-MM-DD) so the endpoint can derive both
  // the selected day and its month in a single request.
  const loadSalesAnalysis = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log("[v0] Loading sales analysis for:", selectedDate)
      const response = await fetch(`/api/daily-dashboard/sales-analysis?date=${selectedDate}`)
      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`API error: ${errorData}`)
      }
      const data = await response.json()
      setAnalysis(data)
      setHasSearched(true)
      console.log("[v0] Sales analysis loaded:", data)
    } catch (error: any) {
      const errorMessage = error.message || "Error desconocido"
      console.error("[v0] Error loading sales analysis:", errorMessage)
      setError(errorMessage)
      setAnalysis(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (viewMode === "monthly") {
      setSelectedMonth(e.target.value)
    } else {
      // daily and analysis modes both use a full date input
      setSelectedDate(e.target.value)
    }
    setHasSearched(false)
  }

  const handleSearch = () => {
    if (viewMode === "analysis") {
      loadSalesAnalysis()
    } else {
      loadDailyStats()
    }
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    setHasSearched(false)
    setStats(null)
    setAnalysis(null)
  }

  const [exporting, setExporting] = useState(false)

  const exportPagosToCSV = async () => {
    if (!stats || stats.pagos.cantidad === 0) return

    const periodLabel = viewMode === "daily" ? selectedDate : selectedMonth

    setExporting(true)
    try {
      // The server endpoint paginates in batches of 1000 and returns the full
      // set of rows as JSON, regardless of total row count.
      const response = await fetch(
        `/api/daily-dashboard/export-pagos?date=${periodLabel}&mode=${viewMode}`,
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error al exportar: ${errorText}`)
      }

      const { rows } = await response.json()

      exportToExcel({
        filename: `pagos_${periodLabel}`,
        sheetName: "Pagos",
        headers: [
          "Cliente",
          "Contrato ID",
          "Numero Cuota",
          "Fecha de Pago",
          "Fecha Vencimiento",
          "Referencia",
          "Fecha Referencia",
          "Monto Esperado",
        ],
        rows: rows || [],
      })
    } catch (error: any) {
      console.error("[v0] Error exporting Excel:", error)
      alert(error?.message || "Error al exportar Excel")
    } finally {
      setExporting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    // Split the date string and create a date without timezone conversion issues
    const [year, month, day] = dateStr.split("-")
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    return date.toLocaleDateString("es-HN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Dashboard {viewMode === "daily" ? "Diario" : viewMode === "monthly" ? "Mensual" : "- Análisis de Ventas"}
          </h1>
          <p className="text-gray-600">
            {viewMode === "analysis"
              ? "Ventas por vendedor y por paquete, del día y del mes"
              : `Resumen de ventas y pagos ${viewMode === "daily" ? "del día" : "del mes"}`}
          </p>
        </div>

        {/* View Mode Toggle */}
        <Card className="p-4 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Vista:</span>
            <Button
              variant={viewMode === "daily" ? "default" : "outline"}
              size="sm"
              onClick={() => handleViewModeChange("daily")}
              className={viewMode === "daily" ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              Diaria
            </Button>
            <Button
              variant={viewMode === "monthly" ? "default" : "outline"}
              size="sm"
              onClick={() => handleViewModeChange("monthly")}
              className={viewMode === "monthly" ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              Mensual
            </Button>
            <Button
              variant={viewMode === "analysis" ? "default" : "outline"}
              size="sm"
              onClick={() => handleViewModeChange("analysis")}
              className={viewMode === "analysis" ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Análisis de Ventas
            </Button>
          </div>
        </Card>

        {/* Date Filter */}
        <Card className="p-4 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-600 flex-shrink-0" />
            <label className="text-sm font-medium text-gray-700">
              {viewMode === "monthly" ? "Seleccionar Mes:" : "Seleccionar Fecha:"}
            </label>
            <Input
              type={viewMode === "monthly" ? "month" : "date"}
              value={viewMode === "monthly" ? selectedMonth : selectedDate}
              onChange={handleDateChange}
              className="w-full sm:w-48"
            />
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
            >
              <Search className="w-4 h-4 mr-2" />
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </Card>

        {/* Stats Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Cargando datos...</p>
          </div>
        ) : error ? (
          <Card className="p-6 bg-red-50 border border-red-200">
            <div className="text-center">
              <p className="text-red-700 font-medium">Error al cargar datos</p>
              <p className="text-red-600 text-sm mt-2">{error}</p>
            </div>
          </Card>
        ) : viewMode === "analysis" && analysis ? (
          <div className="space-y-6">
            {/* Summary banner */}
            <Card className="p-4 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm">
              <p className="text-sm text-gray-600">
                Analizando <span className="font-semibold text-gray-900">{analysis.totalContratosMes}</span>{" "}
                contrato(s) del mes <span className="font-semibold">{analysis.month}</span>. Día seleccionado:{" "}
                <span className="font-semibold">{formatDate(analysis.date)}</span>.
              </p>
            </Card>

            {/* Vendedores */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalysisTable
                title="Vendedores - Día"
                icon={<Users className="w-5 h-5 text-blue-500" />}
                colLabel="Vendedor"
                rows={analysis.vendedores.dia}
                totales={analysis.vendedores.totalesDia}
                accent="blue"
              />
              <AnalysisTable
                title="Vendedores - Mes"
                icon={<Users className="w-5 h-5 text-indigo-500" />}
                colLabel="Vendedor"
                rows={analysis.vendedores.mes}
                totales={analysis.vendedores.totalesMes}
                accent="indigo"
              />
            </div>

            {/* Paquetes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalysisTable
                title="Paquetes más vendidos - Día"
                icon={<Package className="w-5 h-5 text-emerald-500" />}
                colLabel="Paquete"
                rows={analysis.paquetes.dia}
                totales={analysis.paquetes.totalesDia}
                accent="emerald"
              />
              <AnalysisTable
                title="Paquetes más vendidos - Mes"
                icon={<Package className="w-5 h-5 text-teal-500" />}
                colLabel="Paquete"
                rows={analysis.paquetes.mes}
                totales={analysis.paquetes.totalesMes}
                accent="teal"
              />
            </div>
          </div>
        ) : viewMode !== "analysis" && stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ventas Card */}
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-700">
                    Ventas {viewMode === "daily" ? "del Día" : "del Mes"}
                  </p>
                  <h2 className="text-4xl md:text-5xl font-bold text-blue-900">
                    {stats.ventas.cantidad}
                  </h2>
                  <div className="mt-2 p-2 bg-white/60 rounded">
                    <p className="text-xs text-blue-700">Total de Ventas:</p>
                    <p className="text-2xl font-bold text-blue-900">L{(stats.ventas.total || 0).toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-blue-600">
                    {formatDate(stats.date)}
                  </p>
                </div>
                <ShoppingCart className="w-12 h-12 text-blue-400 opacity-50" />
              </div>
              {stats.ventas.cantidad > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-xs text-blue-600 font-medium">Contratos registrados:</p>
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {stats.ventas.datos.map((venta, idx) => (
                      <div key={idx} className="text-xs text-blue-700 bg-white/50 p-1 rounded">
                        <span className="font-semibold">#{venta.id}</span> - {venta.nombre_paquete} (L
                        {venta.valor_paquete.toFixed(2)})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Pagos Card */}
            <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-700">
                    Pagos {viewMode === "daily" ? "del Día" : "del Mes"}
                  </p>
                  <h2 className="text-3xl md:text-4xl font-bold text-green-900">
                    {stats.pagos.cantidad}
                  </h2>
                  <div className="mt-2 p-2 bg-white/60 rounded">
                    <p className="text-xs text-green-700">Total Recaudado:</p>
                    <p className="text-2xl font-bold text-green-900">L{stats.pagos.total.toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-green-600">
                    {formatDate(stats.date)}
                  </p>
                </div>
                <DollarSign className="w-12 h-12 text-green-400 opacity-50" />
              </div>
              {stats.pagos.cantidad > 0 && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-green-600 font-medium">Pagos registrados:</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={exportPagosToCSV}
                      disabled={exporting}
                      className="h-7 text-xs border-green-400 text-green-700 hover:bg-green-100 disabled:opacity-50"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      {exporting ? "Exportando..." : "Exportar CSV"}
                    </Button>
                  </div>
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {stats.pagos.datos.map((pago, idx) => (
                      <div key={idx} className="text-xs text-green-700 bg-white/50 p-1 rounded">
                        <span className="font-semibold">Contrato #{pago.contrato_id}</span> - Vence:{" "}
                        {pago.fecha_vencimiento ? new Date(pago.fecha_vencimiento + "T00:00:00").toLocaleDateString("es-HN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"} (L{pago.monto_esperado.toFixed(2)})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        ) : !hasSearched ? (
          <Card className="p-8 text-center bg-gray-50 border border-gray-200">
            <p className="text-gray-600 text-sm">
              Selecciona {viewMode === "monthly" ? "un mes" : "una fecha"} y haz clic en "Buscar" para ver los datos
            </p>
          </Card>
        ) : (
          <Card className="p-8 text-center bg-gray-50 border border-gray-200">
            <p className="text-gray-600 text-sm">
              No se encontraron datos para {viewMode === "monthly" ? "este mes" : "esta fecha"}
            </p>
          </Card>
        )}
      </div>
      </main>
  )
}

const ACCENTS: Record<string, { header: string; total: string }> = {
  blue: { header: "bg-blue-50 text-blue-800", total: "bg-blue-100 text-blue-900" },
  indigo: { header: "bg-indigo-50 text-indigo-800", total: "bg-indigo-100 text-indigo-900" },
  emerald: { header: "bg-emerald-50 text-emerald-800", total: "bg-emerald-100 text-emerald-900" },
  teal: { header: "bg-teal-50 text-teal-800", total: "bg-teal-100 text-teal-900" },
}

function AnalysisTable({
  title,
  icon,
  colLabel,
  rows,
  totales,
  accent,
}: {
  title: string
  icon: React.ReactNode
  colLabel: string
  rows: AggRow[]
  totales: { cantidad: number; valor: number }
  accent: string
}) {
  const colors = ACCENTS[accent] || ACCENTS.blue
  return (
    <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-gray-100">
        {icon}
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className={`sticky top-0 ${colors.header}`}>
            <tr>
              <th className="px-4 py-2 text-left font-medium">{colLabel}</th>
              <th className="px-4 py-2 text-right font-medium">Cantidad</th>
              <th className="px-4 py-2 text-right font-medium">Valor (L)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  Sin ventas en este periodo
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-800">{r.nombre}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">{r.cantidad}</td>
                  <td className="px-4 py-2 text-right text-gray-700">
                    {r.valor.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className={`border-t-2 border-gray-200 font-bold ${colors.total}`}>
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2 text-right">{totales.cantidad}</td>
              <td className="px-4 py-2 text-right">
                {totales.valor.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}
