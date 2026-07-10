"use client"

import { CardContent } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, ArrowLeft, Eye, ImageIcon } from "lucide-react"
import { NewInstallationDialog } from "@/components/sales/new-installation-dialog"
import { exportToExcel } from "@/lib/export-excel"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface Contract {
  id: number
  cliente_id: string
  vendedor_id: string
  paquete_id: string
  numero_contador: string
  estado_auditoria: string
  fecha_contratacion: string
  nombre_paquete: string
  valor_paquete: number
  url_identidad_frontal: string
  url_identidad_reverso: string
  url_contrato_1: string
  url_contrato_2: string
  url_fachada: string
  url_recibo_pago_inicial: string
  paquete?: {
    nombre: string
    precio_mensual: number
  }
  vendedor?: {
    nombre: string
  }
  cliente?: {
    nombre_completo: string
  }
}

export default function SalesPage() {
  const [showNewInstallation, setShowNewInstallation] = useState(false)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [showImagesDialog, setShowImagesDialog] = useState(false)
  const [dailyStats, setDailyStats] = useState({
    cantidadVentas: 0,
    totalVenta: 0,
    aprobados: 0,
  })
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [exportando, setExportando] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)

  useEffect(() => {
    loadContracts()
    loadDailyStats()
  }, [])

  useEffect(() => {
    setLoading(true)
    setCurrentPage(1)
    loadContracts()
  }, [fechaDesde, fechaHasta])

  useEffect(() => {
    setLoading(true)
    loadContracts()
  }, [currentPage])

  const loadDailyStats = async () => {
    try {
      const response = await fetch(`/api/sales/daily-stats`)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Daily stats loaded:", data)
        setDailyStats({
          cantidadVentas: data.cantidadVentas || 0,
          totalVenta: data.totalVenta || 0,
          aprobados: data.aprobados || 0,
        })
      }
    } catch (error) {
      console.error("[v0] Error loading daily stats:", error)
    }
  }

  const loadContracts = async () => {
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1

      const params = new URLSearchParams()
      params.append("year", String(year))
      params.append("month", String(month))
      params.append("page", String(currentPage))
      
      if (fechaDesde) params.append("fechaDesde", fechaDesde)
      if (fechaHasta) params.append("fechaHasta", fechaHasta)

      const response = await fetch(`/api/contracts?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Loaded contracts:", data)
        setContracts(Array.isArray(data) ? data : data.contracts || [])
        setTotalPages(data.totalPages || 1)
        setTotalRecords(data.total || 0)
      }
    } catch (error) {
      console.error("[v0] Error loading contracts:", error)
      setContracts([])
    } finally {
      setLoading(false)
    }
  }

  const handleContractCreated = () => {
    loadContracts()
    loadDailyStats()
  }

  const exportToExcel = async () => {
    try {
      setExportando(true)

      const params = new URLSearchParams()
      const now = new Date()
      params.append("year", String(now.getFullYear()))
      params.append("month", String(now.getMonth() + 1))
      params.append("exportAll", "true")

      if (fechaDesde) params.append("fechaDesde", fechaDesde)
      if (fechaHasta) params.append("fechaHasta", fechaHasta)

      const allContracts: Contract[] = []
      let currentChunk = 0
      let hasMore = true
      let totalRecords = 0

      while (hasMore) {
        params.set("chunk", String(currentChunk))
        console.log(`[v0] Fetching chunk ${currentChunk}...`)

        const response = await fetch(`/api/contracts?${params.toString()}`)

        if (!response.ok) {
          throw new Error("No se pudo obtener los datos para exportar")
        }

        const data = await response.json()
        const chunkData = Array.isArray(data) ? data : data.contracts || []
        totalRecords = data.total || chunkData.length

        allContracts.push(...chunkData)
        console.log(
          `[v0] Chunk ${currentChunk}: ${chunkData.length} records. Total: ${allContracts.length}/${totalRecords}`,
        )

        hasMore = data.hasMore === true && chunkData.length > 0
        currentChunk++
      }

      if (allContracts.length === 0) {
        alert("No hay contratos para exportar")
        setExportando(false)
        return
      }

      const headers = [
        "ID",
        "N° Contador",
        "Cliente",
        "Paquete",
        "Valor (L)",
        "Vendedor",
        "Estado",
        "Fecha Contratación",
      ]

      const rows = allContracts.map((contract: Contract) => [
        contract.id,
        contract.numero_contador || "N/A",
        contract.cliente?.nombre_completo || "N/A",
        contract.paquete?.nombre || contract.nombre_paquete || "N/A",
        Number(contract.valor_paquete || 0),
        contract.vendedor?.nombre || "N/A",
        contract.estado_auditoria || "N/A",
        new Date(contract.fecha_contratacion).toLocaleDateString("es-HN"),
      ])

      exportToExcel({
        filename: `ventas_${new Date().toISOString().split("T")[0]}`,
        sheetName: "Ventas",
        headers,
        rows,
      })

      alert(`${allContracts.length} ventas exportadas correctamente`)
    } catch (error: any) {
      console.error("[v0] Error exporting to CSV:", error)
      alert("No se pudo descargar el archivo")
    } finally {
      setExportando(false)
    }
  }

  const handleViewImages = (contract: Contract) => {
    setSelectedContract(contract)
    setShowImagesDialog(true)
  }

  const getEstadoBadge = (estado: string) => {
    const estadoNormalizado = estado?.toLowerCase() || ""

    if (estadoNormalizado === "aprobado" || estadoNormalizado === "aprobada") {
      return <Badge className="bg-green-500">Aprobado</Badge>
    }
    if (estadoNormalizado === "rechazado" || estadoNormalizado === "rechazada") {
      return <Badge className="bg-red-500">Rechazado</Badge>
    }
    return <Badge className="bg-yellow-500">Pendiente</Badge>
  }

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto pb-24 md:pb-6">
      <div className="mb-3 md:mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="text-gray-600 hover:text-gray-900">
          <Link href="/dashboard">
            <ArrowLeft className="w-3 h-3 md:w-4 md:h-4 mr-1" />
            <span className="text-xs md:text-sm">Volver</span>
          </Link>
        </Button>
        <Button
          onClick={() => setShowNewInstallation(true)}
          size="sm"
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm"
        >
          <PlusCircle className="w-3 h-3 md:w-4 md:h-4 mr-1" />
          <span className="text-xs md:text-sm">Nueva Venta</span>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-3 md:mb-4">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="p-2 md:p-3 pb-1 md:pb-1.5">
            <CardTitle className="text-lg md:text-2xl font-bold text-orange-600">{dailyStats.cantidadVentas}</CardTitle>
            <CardDescription className="text-[10px] md:text-xs text-gray-500">Ventas día</CardDescription>
          </CardHeader>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="p-2 md:p-3 pb-1 md:pb-1.5">
            <CardTitle className="text-lg md:text-2xl font-bold text-blue-600">
              L{dailyStats.totalVenta.toFixed(0)}
            </CardTitle>
            <CardDescription className="text-[10px] md:text-xs text-gray-500">Valor venta</CardDescription>
          </CardHeader>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="p-2 md:p-3 pb-1 md:pb-1.5">
            <CardTitle className="text-lg md:text-2xl font-bold text-green-600">
              {dailyStats.aprobados}
            </CardTitle>
            <CardDescription className="text-[10px] md:text-xs text-gray-500">Aprobados</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-3 md:p-4 pb-2 md:pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-base md:text-lg">Resumen de ventas</CardTitle>
              <CardDescription className="text-xs md:text-sm">Detalle completo de contratos registrados</CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-2 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Desde:</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Hasta:</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                />
              </div>
              <Button
                onClick={exportToExcel}
                disabled={contracts.length === 0 || exportando}
                variant="outline"
                className="text-xs bg-transparent"
              >
                {exportando ? "Exportando..." : "Exportar CSV"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 md:p-4 pt-0">
          {loading ? (
            <div className="text-center py-8 md:py-12 text-gray-500 text-sm md:text-base">
              <p>Cargando contratos...</p>
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-gray-500 text-sm md:text-base">
              <p>No hay contratos registrados aún</p>
              <p className="text-xs md:text-sm mt-2">Haz clic en "Nueva Venta" para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs md:text-sm">ID</TableHead>
                    <TableHead className="text-xs md:text-sm">N° Contador</TableHead>
                    <TableHead className="text-xs md:text-sm">Cliente</TableHead>
                    <TableHead className="text-xs md:text-sm">Paquete</TableHead>
                    <TableHead className="text-xs md:text-sm">Valor</TableHead>
                    <TableHead className="text-xs md:text-sm hidden md:table-cell">Vendedor</TableHead>
                    <TableHead className="text-xs md:text-sm">Estado</TableHead>
                    <TableHead className="text-xs md:text-sm hidden md:table-cell">Fecha</TableHead>
                    <TableHead className="text-xs md:text-sm">Docs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium text-xs md:text-sm">{contract.id}</TableCell>
                      <TableCell className="text-xs md:text-sm">{contract.numero_contador || "N/A"}</TableCell>
                      <TableCell className="text-xs md:text-sm">
                        {contract.cliente?.nombre_completo || "N/A"}
                      </TableCell>
                      <TableCell className="text-xs md:text-sm">
                        {contract.paquete?.nombre || contract.nombre_paquete}
                      </TableCell>
                      <TableCell className="text-xs md:text-sm">L{(contract.valor_paquete || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-xs md:text-sm hidden md:table-cell">
                        {contract.vendedor?.nombre || "N/A"}
                      </TableCell>
                      <TableCell className="text-xs md:text-sm">{getEstadoBadge(contract.estado_auditoria)}</TableCell>
                      <TableCell className="text-xs md:text-sm hidden md:table-cell">
                        {contract.fecha_contratacion.split("T")[0]}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewImages(contract)}
                          className="text-orange-600 hover:text-orange-700 text-xs p-1 md:p-2"
                        >
                          <Eye className="w-3 h-3 md:w-4 md:h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <NewInstallationDialog
        open={showNewInstallation}
        onOpenChange={setShowNewInstallation}
        onContractCreated={handleContractCreated}
      />

      <Dialog open={showImagesDialog} onOpenChange={setShowImagesDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documentos del Contrato #{selectedContract?.id}</DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {[
                { label: "Identidad Frontal", url: selectedContract.url_identidad_frontal },
                { label: "Identidad Reverso", url: selectedContract.url_identidad_reverso },
                { label: "Contrato 1", url: selectedContract.url_contrato_1 },
                { label: "Contrato 2", url: selectedContract.url_contrato_2 },
                { label: "Fachada", url: selectedContract.url_fachada },
                { label: "Recibo Pago Inicial", url: selectedContract.url_recibo_pago_inicial },
              ].map((doc, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-orange-500" />
                    {doc.label}
                  </h4>
                  {doc.url ? (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={doc.url || "/placeholder.svg"}
                        alt={doc.label}
                        className="w-full h-48 object-cover rounded border hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    </a>
                  ) : (
                    <div className="w-full h-48 bg-gray-100 rounded border flex items-center justify-center text-gray-400">
                      No disponible
            </div>
          )}
          {!loading && contracts.length > 0 && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs md:text-sm text-gray-600">
                Página {currentPage} de {totalPages} ({totalRecords} registros totales)
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Anterior
                </Button>
                <Button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
