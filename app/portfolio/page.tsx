"use client"

import { useAuth } from "@/lib/auth-context"
import { redirect } from "next/navigation"
import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, ArrowLeft, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { exportToExcel as exportRowsToExcel } from "@/lib/export-excel"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Cuota {
  contrato_id: number
  nombre_completo: string
  numero_identidad: string
  direccion: string
  numero_cuota: number
  fecha_vencimiento: string
  monto_esperado: number
  estado: string
  comentario: string
}

export default function PortfolioPage() {
  const { user, isLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchId, setSearchId] = useState("")
  const [estadoFilter, setEstadoFilter] = useState("all")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      redirect("/login")
    }
    // Check if user has cartera permission
    if (!isLoading && user && !user.permissions?.cartera) {
      redirect("/dashboard")
    }
  }, [user, isLoading])

  useEffect(() => {
    loadPortfolioData(1)
  }, [])

  // Reset to page 1 and reload when either search changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPortfolioData(1, searchQuery, searchId)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchId])

  const loadPortfolioData = async (page: number, search = searchQuery, id = searchId) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page) })
      if (search.trim()) params.set("search", search.trim())
      if (id.trim()) params.set("searchId", id.trim())
      const response = await fetch(`/api/portfolio?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setCuotas(result.data)
        setTotalPages(result.totalPages)
        setTotal(result.total)
        setCurrentPage(page)
      } else {
        console.error("Error loading portfolio:", result.error)
      }
    } catch (error) {
      console.error("Error loading portfolio:", error)
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    )
  }

  // Server now handles search filter, only apply estado filter client-side
  const filteredCuotas = cuotas.filter((cuota) => {
    const matchesEstado = estadoFilter === "all" || cuota.estado?.toLowerCase() === estadoFilter.toLowerCase()
    return matchesEstado
  })

  const getEstadoBadgeClass = (estado: string) => {
    const estadoLower = estado?.toLowerCase() || ""
    
    // Green for "Al dia"
    if (estadoLower.includes("al dia") || estadoLower === "al día") {
      return "bg-green-100 text-green-800 border border-green-300"
    }
    
    // Red for "Cortar"
    if (estadoLower === "cortar") {
      return "bg-red-100 text-red-800 border border-red-300"
    }
    
    // Yellow for "Pendiente cuota"
    if (estadoLower.includes("pendiente")) {
      return "bg-yellow-100 text-yellow-800 border border-yellow-300"
    }
    
    // Default
    return "bg-gray-100 text-gray-800 border border-gray-300"
  }

  const exportToExcel = async () => {
    setExporting(true)
    try {
      console.log("[v0] Starting Excel export with filters applied")
      const allCuotas: Cuota[] = []
      let page = 1
      let hasMore = true

      // Fetch all records in batches
      while (hasMore) {
        console.log("[v0] Fetching batch page", page)
        const response = await fetch(`/api/portfolio?page=${page}`)
        const result = await response.json()

        if (result.success && result.data.length > 0) {
          allCuotas.push(...result.data)
          page++

          if (page > result.totalPages) {
            hasMore = false
          }
        } else {
          hasMore = false
        }
      }

      console.log("[v0] Total records fetched:", allCuotas.length)

      // Apply the same filters as the table
      const filteredExportData = allCuotas.filter((cuota) => {
        // Search filter
        const matchesSearch =
          cuota.nombre_completo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cuota.numero_identidad.includes(searchQuery) ||
          cuota.direccion.toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(cuota.contrato_id).includes(searchQuery)

        // Estado filter
        const matchesEstado = estadoFilter === "all" || cuota.estado?.toLowerCase() === estadoFilter.toLowerCase()

        // Date range filter
        let matchesFecha = true
        if (fechaDesde || fechaHasta) {
          const cuotaDate = new Date(cuota.fecha_vencimiento + "T00:00:00")
          if (fechaDesde) {
            const desdeDate = new Date(fechaDesde)
            matchesFecha = cuotaDate >= desdeDate
          }
          if (fechaHasta && matchesFecha) {
            const hastaDate = new Date(fechaHasta)
            matchesFecha = cuotaDate <= hastaDate
          }
        }

        return matchesSearch && matchesEstado && matchesFecha
      })

      console.log("[v0] Records after filtering:", filteredExportData.length)

      const headers = [
        "Contrato ID",
        "Nombre Cliente",
        "Identidad",
        "Dirección",
        "Cuota #",
        "Fecha Vencimiento",
        "Monto Esperado (L)",
        "Estado",
      ]

      const rows = filteredExportData.map((cuota) => [
        cuota.contrato_id,
        cuota.nombre_completo,
        cuota.numero_identidad,
        cuota.direccion,
        cuota.numero_cuota,
        new Date(cuota.fecha_vencimiento + "T00:00:00").toLocaleDateString(),
        Number(cuota.monto_esperado),
        cuota.estado,
      ])

      exportRowsToExcel({
        filename: `Cartera_${new Date().toISOString().split("T")[0]}`,
        sheetName: "Cartera",
        headers,
        rows,
      })

      console.log("[v0] Excel export completed - exported:", filteredExportData.length, "records")
    } catch (error) {
      console.error("[v0] Error exporting to Excel:", error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-3 md:p-6 max-w-full mx-auto pb-24 md:pb-6">
      <div className="mb-3 md:mb-4">
        <Button variant="ghost" size="sm" asChild className="text-gray-600 hover:text-gray-900">
          <Link href="/dashboard">
            <ArrowLeft className="w-3 h-3 md:w-4 md:h-4 mr-1" />
            <span className="text-xs md:text-sm">Volver</span>
          </Link>
        </Button>
      </div>

      <div className="mb-4 md:mb-6 bg-gradient-to-r from-orange-50 to-blue-50 p-3 md:p-4 rounded-lg border border-orange-100 flex items-center justify-between">
        <h1 className="text-lg md:text-xl font-bold text-gray-800">Módulo de Cartera</h1>
        <Button
          size="sm"
          onClick={exportToExcel}
          disabled={exporting || total === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm"
        >
          <Download className="w-3 h-3 md:w-4 md:h-4 mr-1" />
          {exporting ? "Exportando..." : "Descargar CSV"}
        </Button>
      </div>

      {/* Search */}
      <Card className="mb-4 md:mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Buscar por ID de contrato</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Ej: 1234"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="pl-10 text-sm"
                type="number"
                min={1}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Buscar por nombre</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Nombre del cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="mb-4 md:mb-6 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Estado Filter */}
          <div>
            <label className="text-xs md:text-sm font-medium text-gray-700 block mb-2">Estado</label>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="Al dia">Al día</SelectItem>
                <SelectItem value="Pendiente cuota">Pendiente cuota</SelectItem>
                <SelectItem value="Cortar">Cortar</SelectItem>
                <SelectItem value="Recuperar equipo">Recuperar equipo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fecha Desde */}
          <div>
            <label className="text-xs md:text-sm font-medium text-gray-700 block mb-2">Vencimiento Desde</label>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="text-xs md:text-sm font-medium text-gray-700 block mb-2">Vencimiento Hasta</label>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEstadoFilter("all")
                setFechaDesde("")
                setFechaHasta("")
              }}
              className="w-full"
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold">Contrato ID</TableHead>
                    <TableHead className="text-xs font-semibold">Nombre Cliente</TableHead>
                    <TableHead className="text-xs font-semibold">Identidad</TableHead>
                    <TableHead className="text-xs font-semibold">Dirección</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Cuota #</TableHead>
                    <TableHead className="text-xs font-semibold">Vencimiento</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Monto</TableHead>
                    <TableHead className="text-xs font-semibold">Estado</TableHead>
                    <TableHead className="text-xs font-semibold">Comentario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCuotas.length > 0 ? (
                    filteredCuotas.map((cuota, idx) => (
                      <TableRow key={`${cuota.contrato_id}-${idx}`} className="hover:bg-gray-50">
                        <TableCell className="text-xs font-medium">#{cuota.contrato_id}</TableCell>
                        <TableCell className="text-xs">{cuota.nombre_completo}</TableCell>
                        <TableCell className="text-xs">{cuota.numero_identidad}</TableCell>
                        <TableCell className="text-xs truncate max-w-[120px]">{cuota.direccion}</TableCell>
                        <TableCell className="text-xs text-right">{cuota.numero_cuota}</TableCell>
                        <TableCell className="text-xs">
                          {new Date(cuota.fecha_vencimiento + "T00:00:00").toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          L.{Number(cuota.monto_esperado).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getEstadoBadgeClass(cuota.estado)}`}>
                            {cuota.estado}
                          </span>
                        </TableCell>
                        <TableCell
                          className="text-xs truncate max-w-[180px] text-gray-600"
                          title={cuota.comentario || ""}
                        >
                          {cuota.comentario || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500 text-xs">
                        {searchQuery ? "No se encontraron cuotas" : "No hay cuotas disponibles"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 py-4">
              <Button
                size="sm"
                onClick={() => loadPortfolioData(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading}
              >
                Anterior
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Página</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = Math.min(totalPages, Math.max(1, Number.parseInt(e.target.value) || 1))
                    loadPortfolioData(page)
                  }}
                  className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm"
                />
                <span className="text-sm text-gray-600">de {totalPages}</span>
              </div>

              <Button
                size="sm"
                onClick={() => loadPortfolioData(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || loading}
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Export Button */}
      <Button
        size="sm"
        onClick={exportToExcel}
        disabled={exporting}
        className="mt-4"
      >
        <Download className="w-4 h-4 mr-2" />
        Exportar a Excel
      </Button>
    </div>
  )
}
