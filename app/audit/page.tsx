"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Eye, CheckCircle, Trash2, Edit, ChevronLeft, ChevronRight, XCircle, Upload, Loader2, BarChart3, TrendingUp, Users, Package, DollarSign, Clock, Activity, Award } from "lucide-react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { EditContractDialog } from "@/components/audit/edit-contract-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Contract {
  id: number
  cliente_id: string
  vendedor_id: string
  paquete_id: string
  numero_contador: string
  estado_auditoria: string
  observaciones_rechazo?: string
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

export default function AuditPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [showImagesDialog, setShowImagesDialog] = useState(false)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectObservations, setRejectObservations] = useState<string>("")
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [approveTargetId, setApproveTargetId] = useState<number | null>(null)
  const [approveReferencia, setApproveReferencia] = useState<string>("")
  const [editingContractId, setEditingContractId] = useState<number | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [replacingImageField, setReplacingImageField] = useState<string | null>(null)
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString())
  const [estadoFilter, setEstadoFilter] = useState<string>("all")
  const [contratoIdFilter, setContratoIdFilter] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalContracts, setTotalContracts] = useState(0)
  const itemsPerPage = 10000
  const { toast } = useToast()

  // Dashboard state
  const [activeTab, setActiveTab] = useState<"auditoria" | "dashboard">("auditoria")
  const [dashboardMes, setDashboardMes] = useState(() => new Date().toISOString().slice(0, 7))
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardData, setDashboardData] = useState<{
    mes: string
    resumen: {
      totalContratos: number
      pendientes: number
      aprobados: number
      rechazados: number
      totalVendido: number
      totalPendienteValor: number
      tasaAprobacion: number
    }
    porDia: Array<{ fecha: string; total: number; aprobados: number; pendientes: number; rechazados: number; valor: number }>
    porVendedor: Array<{
      id: number
      nombre: string
      total: number
      aprobados: number
      pendientes: number
      rechazados: number
      valorTotal: number
    }>
    porPaquete: Array<{
      id: number
      nombre: string
      megas: number
      precio: number
      cantidad: number
      valorTotal: number
    }>
    actividadReciente: Array<{
      tipo: "pendiente" | "aprobada" | "rechazada"
      contrato_id: number
      cliente: string
      vendedor: string
      paquete: string
      megas: number
      valor: number
      fecha: string
      hora: string
    }>
  } | null>(null)

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedYear, selectedMonth, estadoFilter, contratoIdFilter])

  useEffect(() => {
    loadContracts()
  }, [selectedYear, selectedMonth, estadoFilter, contratoIdFilter, currentPage])

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true)
    try {
      const res = await fetch(`/api/audit/dashboard?mes=${dashboardMes}`)
      const data = await res.json()
      if (data.success) {
        setDashboardData(data)
      }
    } catch (e) {
      console.error("Error loading audit dashboard:", e)
    } finally {
      setDashboardLoading(false)
    }
  }, [dashboardMes])

  useEffect(() => {
    if (activeTab === "dashboard") loadDashboard()
  }, [activeTab, loadDashboard])

  const loadContracts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        year: selectedYear,
        month: selectedMonth,
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      })

      if (estadoFilter && estadoFilter !== "all") {
        params.append("estado", estadoFilter)
      }

      if (contratoIdFilter && contratoIdFilter.trim() !== "") {
        params.append("contractId", contratoIdFilter.trim())
      }

      const response = await fetch(`/api/contracts?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        if (data.contracts) {
          setContracts(data.contracts)
          setTotalPages(data.totalPages)
          setTotalContracts(data.total)
        } else {
          setContracts(data)
        }
      }
    } catch (error) {
      console.error("[v0] Error loading contracts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (contractId: number) => {
    setEditingContractId(contractId)
    setShowEditDialog(true)
  }

  const openApproveDialog = (contractId: number) => {
    setApproveTargetId(contractId)
    setApproveReferencia("")
    setShowApproveDialog(true)
  }

  const closeApproveDialog = () => {
    setShowApproveDialog(false)
    setApproveTargetId(null)
    setApproveReferencia("")
  }

  const handleApprove = async () => {
    if (!approveTargetId) return
    setApprovingId(approveTargetId)
    setShowApproveDialog(false)
    try {
      const response = await fetch(`/api/contracts/${approveTargetId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referencia: approveReferencia.trim() }),
      })

      if (response.ok) {
        toast({
          title: "Contrato aprobado",
          description: "El contrato ha sido aprobado exitosamente",
        })
        loadContracts()
      } else {
        toast({
          title: "Error",
          description: "No se pudo aprobar el contrato",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error approving contract:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al aprobar el contrato",
        variant: "destructive",
      })
    } finally {
      setApprovingId(null)
      setApproveTargetId(null)
    }
  }

  const handleDelete = async (contractId: number) => {
    if (
      !confirm(
        "¿Estás seguro de eliminar este contrato? Esta acción eliminará el contrato, el cliente y el plan de pagos asociado.",
      )
    ) {
      return
    }

    setDeletingId(contractId)
    try {
      const response = await fetch(`/api/contracts/${contractId}/delete`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Contrato eliminado",
          description: "El contrato, cliente y plan de pagos han sido eliminados exitosamente",
        })
        loadContracts()
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "No se pudo eliminar el contrato",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error deleting contract:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al eliminar el contrato",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const openRejectDialog = (contractId: number) => {
    setRejectingId(contractId)
    setRejectObservations("")
    setShowRejectDialog(true)
  }

  const closeRejectDialog = () => {
    setShowRejectDialog(false)
    setRejectingId(null)
    setRejectObservations("")
  }

  const handleReject = async () => {
    if (!rejectingId) return

    if (!rejectObservations.trim()) {
      toast({
        title: "Error",
        description: "Debe ingresar observaciones del rechazo",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/contracts/${rejectingId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          observaciones_rechazo: rejectObservations,
        }),
      })

      if (response.ok) {
        toast({
          title: "Contrato rechazado",
          description: "El contrato ha sido rechazado exitosamente",
        })
        closeRejectDialog()
        loadContracts()
      } else {
        toast({
          title: "Error",
          description: "No se pudo rechazar el contrato",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error rejecting contract:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al rechazar el contrato",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewImages = (contract: Contract) => {
    setSelectedContract(contract)
    setShowImagesDialog(true)
    setReplacingImageField(null)
  }

  const handleReplaceImage = async (field: string, file: File) => {
    if (!selectedContract) return
    setUploadingField(field)
    try {
      // Upload to storage
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", field)
      formData.append("instalacionId", String(selectedContract.id))

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
      const uploadData = await uploadRes.json()

      if (!uploadRes.ok || !uploadData.url) {
        toast({ title: "Error", description: "No se pudo subir la imagen", variant: "destructive" })
        return
      }

      // Update the contract field
      const patchRes = await fetch(`/api/contracts/${selectedContract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, url: uploadData.url }),
      })

      if (!patchRes.ok) {
        toast({ title: "Error", description: "No se pudo actualizar la imagen", variant: "destructive" })
        return
      }

      // Update local state immediately
      setSelectedContract((prev) => prev ? { ...prev, [field]: uploadData.url } : prev)
      setContracts((prev) =>
        prev.map((c) => c.id === selectedContract.id ? { ...c, [field]: uploadData.url } : c)
      )
      setReplacingImageField(null)
      toast({ title: "Imagen actualizada", description: "La imagen fue reemplazada exitosamente" })
    } catch (e) {
      console.error("[v0] Error replacing image:", e)
      toast({ title: "Error", description: "Ocurrió un error al reemplazar la imagen", variant: "destructive" })
    } finally {
      setUploadingField(null)
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "aprobada":
        return <Badge className="bg-green-500">Aprobado</Badge>
      case "rechazada":
        return <Badge className="bg-red-500">Rechazado</Badge>
      default:
        return <Badge className="bg-yellow-500">Pendiente</Badge>
    }
  }

  const calculateSymbolicCost = (fecha_contratacion: string): number => {
    const date = new Date(fecha_contratacion)
    const day = date.getDate()

    if (day >= 16 && day <= 21) return 200
    if (day >= 22 && day <= 26) return 130
    return 0
  }

  const pendingContracts = contracts.filter((c) => c.estado_auditoria === "pendiente")
  const approvedContracts = contracts.filter((c) => c.estado_auditoria === "aprobada")
  const rejectedContracts = contracts.filter((c) => c.estado_auditoria === "rechazada")

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const monthOptions = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ]

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto pb-24 md:pb-6">
      <div className="mb-3 md:mb-4">
        <Button variant="ghost" size="sm" asChild className="text-gray-600 hover:text-gray-900">
          <Link href="/dashboard">
            <ArrowLeft className="w-3 h-3 md:w-4 md:h-4 mr-1" />
            <span className="text-xs md:text-sm">Volver</span>
          </Link>
        </Button>
      </div>

      <div className="mb-4 md:mb-6 bg-gradient-to-r from-blue-50 to-orange-50 p-3 md:p-4 rounded-lg border border-blue-100">
        <h1 className="text-lg md:text-xl font-bold text-gray-800">Módulo de Auditoría</h1>
        <p className="text-xs md:text-sm text-gray-600 mt-0.5">Revisa y aprueba contratos pendientes</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 p-1.5 bg-gray-200 rounded-lg w-fit border border-gray-300">
        <button
          onClick={() => setActiveTab("auditoria")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "auditoria"
              ? "bg-white text-orange-600 shadow-md border border-orange-200"
              : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
          }`}
        >
          <Eye className="w-4 h-4" />
          Auditoría
        </button>
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "dashboard"
              ? "bg-white text-blue-600 shadow-md border border-blue-200"
              : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Dashboard
        </button>
      </div>

      {/* =================== AUDITORIA TAB =================== */}
      {activeTab === "auditoria" && <>
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-6">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="p-2 md:p-3 pb-1 md:pb-2">
            <CardTitle className="text-lg md:text-2xl font-bold text-yellow-600">{pendingContracts.length}</CardTitle>
            <CardDescription className="text-[10px] md:text-xs text-gray-500">Pendientes</CardDescription>
          </CardHeader>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="p-2 md:p-3 pb-1 md:pb-2">
            <CardTitle className="text-lg md:text-2xl font-bold text-green-600">{approvedContracts.length}</CardTitle>
            <CardDescription className="text-[10px] md:text-xs text-gray-500">Aprobados</CardDescription>
          </CardHeader>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="p-2 md:p-3 pb-1 md:pb-2">
            <CardTitle className="text-lg md:text-2xl font-bold text-red-600">{rejectedContracts.length}</CardTitle>
            <CardDescription className="text-[10px] md:text-xs text-gray-500">Rechazados</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Contratos para auditoría</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Revisa los documentos y aprueba los contratos
            {totalContracts > 0 && <span className="ml-2 text-gray-500">({totalContracts} total)</span>}
          </CardDescription>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="aprobada">Aprobado</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="text"
              placeholder="Buscar por ID"
              value={contratoIdFilter}
              onChange={(e) => setContratoIdFilter(e.target.value)}
              className="w-full"
            />
          </div>
        </CardHeader>
        <CardContent className="p-2 md:p-6">
          {loading ? (
            <div className="text-center py-8 md:py-12 text-gray-500 text-sm md:text-base">
              <p>Cargando contratos...</p>
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-gray-500 text-sm md:text-base">
              <p>No hay contratos registrados aún</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs md:text-sm">ID</TableHead>
                      <TableHead className="text-xs md:text-sm">Cliente</TableHead>
                      <TableHead className="text-xs md:text-sm">N° Contador</TableHead>
                      <TableHead className="text-xs md:text-sm">Paquete</TableHead>
                      <TableHead className="text-xs md:text-sm hidden md:table-cell">Valor</TableHead>
                      <TableHead className="text-xs md:text-sm hidden md:table-cell">C. Simbólico</TableHead>
                      <TableHead className="text-xs md:text-sm hidden md:table-cell">Vendedor</TableHead>
                      <TableHead className="text-xs md:text-sm">Estado</TableHead>
                      <TableHead className="text-xs md:text-sm hidden lg:table-cell">Fecha</TableHead>
                      <TableHead className="text-xs md:text-sm">Docs</TableHead>
                      <TableHead className="text-xs md:text-sm">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium text-xs md:text-sm">{contract.id}</TableCell>
                        <TableCell className="text-xs md:text-sm">{contract.cliente?.nombre_completo || "N/A"}</TableCell>
                        <TableCell className="text-xs md:text-sm">{contract.numero_contador || "N/A"}</TableCell>
                        <TableCell className="text-xs md:text-sm">
                          {contract.paquete?.nombre || contract.nombre_paquete}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm hidden md:table-cell">
                          L{(contract.valor_paquete || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm hidden md:table-cell font-semibold text-orange-600">
                          L{calculateSymbolicCost(contract.fecha_contratacion).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm hidden md:table-cell">
                          {contract.vendedor?.nombre || "N/A"}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm">
                          {getEstadoBadge(contract.estado_auditoria)}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm hidden lg:table-cell">
                          {new Date(contract.fecha_contratacion).toLocaleDateString("es-HN")}
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
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(contract.id)}
                              className="text-blue-600 hover:text-blue-700 text-xs p-1 md:p-2"
                            >
                              <Edit className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                            {contract.estado_auditoria === "pendiente" && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => openApproveDialog(contract.id)}
                                  disabled={approvingId === contract.id}
                                  className="bg-green-500 hover:bg-green-600 text-xs p-1 md:p-2"
                                >
                                  <CheckCircle className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                                  <span className="hidden md:inline">
                                    {approvingId === contract.id ? "..." : "Aprobar"}
                                  </span>
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => openRejectDialog(contract.id)}
                                  disabled={rejectingId === contract.id}
                                  className="bg-red-500 hover:bg-red-600 text-xs p-1 md:p-2"
                                >
                                  <XCircle className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                                  <span className="hidden md:inline">
                                    {rejectingId === contract.id ? "..." : "Rechazar"}
                                  </span>
                                </Button>
                              </div>
                            )}
                            {contract.estado_auditoria === "aprobada" && (
                              <span className="text-xs text-green-600">✓</span>
                            )}
                            {contract.estado_auditoria === "rechazada" && (
                              <span className="text-xs text-red-600">✗</span>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(contract.id)}
                              disabled={deletingId === contract.id}
                              className="text-xs p-1 md:p-2"
                            >
                              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <div className="text-xs md:text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="text-xs"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="text-xs"
                    >
                      Siguiente
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      </>}

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
                {dashboardLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Activity className="w-4 h-4 mr-2" />}
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
                    <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Ventas en Vivo</span>
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex gap-6 animate-marquee whitespace-nowrap">
                      {[...dashboardData.actividadReciente, ...dashboardData.actividadReciente].map((act, idx) => (
                        <span key={idx} className="inline-flex items-center gap-2 text-sm">
                          {act.tipo === "aprobada" && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
                          {act.tipo === "rechazada" && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                          {act.tipo === "pendiente" && <Clock className="w-3.5 h-3.5 text-yellow-400" />}
                          <span className={`font-medium ${
                            act.tipo === "aprobada" ? "text-green-300" :
                            act.tipo === "rechazada" ? "text-red-300" :
                            "text-yellow-300"
                          }`}>
                            {act.tipo === "aprobada" ? "Aprobada" :
                             act.tipo === "rechazada" ? "Rechazada" :
                             "Pendiente"}
                          </span>
                          <span className="text-white font-semibold">Contrato #{act.contrato_id}</span>
                          <span className="text-gray-300">{act.cliente}</span>
                          <span className="text-gray-500">-</span>
                          <span className="text-blue-300">{act.paquete} ({act.megas}MB)</span>
                          <span className="text-green-400 font-medium">L{act.valor.toLocaleString()}</span>
                          <span className="text-gray-500">({act.fecha})</span>
                          <span className="text-gray-600 mx-2">|</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-3.5 h-3.5 opacity-80" />
                    <span className="text-[10px] font-medium opacity-80">Total Ventas</span>
                  </div>
                  <p className="text-xl font-bold">{dashboardData.resumen.totalContratos}</p>
                  <p className="text-[10px] opacity-70">contratos</p>
                </Card>
                <Card className="p-3 bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-3.5 h-3.5 opacity-80" />
                    <span className="text-[10px] font-medium opacity-80">Total Vendido</span>
                  </div>
                  <p className="text-xl font-bold">L{dashboardData.resumen.totalVendido.toLocaleString()}</p>
                  <p className="text-[10px] opacity-70">{dashboardData.resumen.tasaAprobacion}% aprobado</p>
                </Card>
                <Card className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 opacity-80" />
                    <span className="text-[10px] font-medium opacity-80">Pendientes</span>
                  </div>
                  <p className="text-xl font-bold">{dashboardData.resumen.pendientes}</p>
                  <p className="text-[10px] opacity-70">L{dashboardData.resumen.totalPendienteValor.toLocaleString()}</p>
                </Card>
                <Card className="p-3 bg-gradient-to-br from-red-500 to-red-600 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-3.5 h-3.5 opacity-80" />
                    <span className="text-[10px] font-medium opacity-80">Rechazados</span>
                  </div>
                  <p className="text-xl font-bold">{dashboardData.resumen.rechazados}</p>
                  <p className="text-[10px] opacity-70">contratos</p>
                </Card>
              </div>

              {/* Daily Chart */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Ventas por Dia
                </h3>
                <div className="h-52 flex items-end gap-1 overflow-x-auto pb-6 relative">
                  {dashboardData.porDia.map((dia) => {
                    const maxTotal = Math.max(...dashboardData.porDia.map(d => d.total), 1)
                    const barHeight = dia.total > 0 ? Math.max((dia.total / maxTotal) * 160, 8) : 4
                    const dayNum = dia.fecha.split("-")[2]
                    return (
                      <div key={dia.fecha} className="flex flex-col items-center min-w-[20px] group relative">
                        <div 
                          className="w-4 rounded-t transition-all hover:opacity-80 flex flex-col-reverse overflow-hidden bg-gray-100"
                          style={{ height: `${barHeight}px` }}
                        >
                          {dia.total > 0 && (
                            <>
                              <div 
                                className="w-full bg-green-500" 
                                style={{ height: `${(dia.aprobados / dia.total) * barHeight}px` }}
                              />
                              <div 
                                className="w-full bg-amber-400" 
                                style={{ height: `${(dia.pendientes / dia.total) * barHeight}px` }}
                              />
                              <div 
                                className="w-full bg-red-500" 
                                style={{ height: `${(dia.rechazados / dia.total) * barHeight}px` }}
                              />
                            </>
                          )}
                        </div>
                        <span className="text-[9px] text-gray-400 mt-1">{dayNum}</span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-20">
                          <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                            <p className="font-semibold">{dia.fecha}</p>
                            <p className="text-green-400">Aprobados: {dia.aprobados}</p>
                            <p className="text-amber-400">Pendientes: {dia.pendientes}</p>
                            <p className="text-red-400">Rechazados: {dia.rechazados}</p>
                            <p className="text-blue-300 font-semibold">Total: {dia.total} - L{dia.valor.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-center gap-4 text-xs mt-2">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> Aprobados</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400" /> Pendientes</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Rechazados</span>
                </div>
              </Card>

              {/* Sellers Ranking & Packages Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Sellers */}
                <Card className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Award className="w-4 h-4 text-orange-500" />
                    Ranking de Vendedores
                  </h3>
                  <div className="space-y-2">
                    {dashboardData.porVendedor.slice(0, 10).map((vendedor, idx) => {
                      const maxVentas = Math.max(...dashboardData.porVendedor.map(v => v.total), 1)
                      const barWidth = (vendedor.total / maxVentas) * 100
                      return (
                        <div key={vendedor.id} className="relative">
                          <div className="flex items-center gap-2 relative z-10 py-2 px-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              idx === 0 ? "bg-yellow-400 text-yellow-900" :
                              idx === 1 ? "bg-gray-300 text-gray-700" :
                              idx === 2 ? "bg-orange-400 text-orange-900" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{vendedor.nombre}</p>
                              <p className="text-[10px] text-gray-500">
                                {vendedor.aprobados} aprobados | {vendedor.pendientes} pendientes | {vendedor.rechazados} rechazados
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900">{vendedor.total}</p>
                              <p className="text-[10px] text-green-600">L{vendedor.valorTotal.toLocaleString()}</p>
                            </div>
                          </div>
                          <div 
                            className="absolute inset-y-0 left-0 bg-blue-50 rounded-lg transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      )
                    })}
                    {dashboardData.porVendedor.length === 0 && (
                      <p className="text-center text-gray-400 py-4 text-sm">No hay datos de vendedores</p>
                    )}
                  </div>
                </Card>

                {/* Packages Breakdown */}
                <Card className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-500" />
                    Ventas por Paquete
                  </h3>
                  <div className="space-y-3">
                    {dashboardData.porPaquete.map((paquete) => {
                      const maxCantidad = Math.max(...dashboardData.porPaquete.map(p => p.cantidad), 1)
                      const barWidth = (paquete.cantidad / maxCantidad) * 100
                      return (
                        <div key={paquete.id} className="relative">
                          <div className="flex items-center gap-3 relative z-10 py-2 px-2">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex flex-col items-center justify-center text-white">
                              <span className="text-xs font-bold">{paquete.megas}</span>
                              <span className="text-[8px]">MB</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{paquete.nombre}</p>
                              <p className="text-[10px] text-gray-500">L{paquete.precio.toLocaleString()} /mes</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900">{paquete.cantidad}</p>
                              <p className="text-[10px] text-green-600">L{paquete.valorTotal.toLocaleString()}</p>
                            </div>
                          </div>
                          <div 
                            className="absolute inset-y-0 left-0 bg-purple-50 rounded-lg transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      )
                    })}
                    {dashboardData.porPaquete.length === 0 && (
                      <p className="text-center text-gray-400 py-4 text-sm">No hay datos de paquetes</p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Recent Activity List */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-500" />
                  Ultimas Ventas del Mes
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {dashboardData.actividadReciente.slice(0, 20).map((act, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        act.tipo === "aprobada" ? "bg-green-100" :
                        act.tipo === "rechazada" ? "bg-red-100" :
                        "bg-yellow-100"
                      }`}>
                        {act.tipo === "aprobada" && <CheckCircle className="w-4 h-4 text-green-600" />}
                        {act.tipo === "rechazada" && <XCircle className="w-4 h-4 text-red-600" />}
                        {act.tipo === "pendiente" && <Clock className="w-4 h-4 text-yellow-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          Contrato #{act.contrato_id}
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                            act.tipo === "aprobada" ? "bg-green-100 text-green-700" :
                            act.tipo === "rechazada" ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {act.tipo === "aprobada" ? "Aprobada" :
                             act.tipo === "rechazada" ? "Rechazada" :
                             "Pendiente"}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {act.cliente} - {act.paquete} ({act.megas}MB) - <span className="text-green-600 font-medium">L{act.valor.toLocaleString()}</span>
                        </p>
                        <p className="text-[10px] text-gray-400">Vendedor: {act.vendedor}</p>
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

      <Dialog open={showImagesDialog} onOpenChange={(open) => { setShowImagesDialog(open); if (!open) setReplacingImageField(null) }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documentos del Contrato #{selectedContract?.id}</DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {[
                { label: "Identidad Frontal", field: "url_identidad_frontal", url: selectedContract.url_identidad_frontal },
                { label: "Identidad Reverso", field: "url_identidad_reverso", url: selectedContract.url_identidad_reverso },
                { label: "Contrato 1", field: "url_contrato_1", url: selectedContract.url_contrato_1 },
                { label: "Contrato 2", field: "url_contrato_2", url: selectedContract.url_contrato_2 },
                { label: "Fachada", field: "url_fachada", url: selectedContract.url_fachada },
                { label: "Recibo Pago Inicial", field: "url_recibo_pago_inicial", url: selectedContract.url_recibo_pago_inicial },
              ].map((doc) => (
                <div key={doc.field} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">{doc.label}</h4>
                    {uploadingField === doc.field ? (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Subiendo...
                      </div>
                    ) : replacingImageField === doc.field ? (
                      <div className="flex items-center gap-1">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleReplaceImage(doc.field, file)
                            }}
                          />
                          <span className="inline-flex items-center gap-1 text-xs bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 transition-colors">
                            <Upload className="w-3 h-3" />
                            Seleccionar
                          </span>
                        </label>
                        <button
                          onClick={() => setReplacingImageField(null)}
                          className="text-xs text-gray-500 hover:text-gray-700 px-1"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReplacingImageField(doc.field)}
                        className="h-7 px-2 text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
                      >
                        <Upload className="w-3 h-3 mr-1" />
                        Reemplazar
                      </Button>
                    )}
                  </div>
                  {doc.url ? (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={doc.url}
                        alt={doc.label}
                        className="w-full h-48 object-cover rounded border hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    </a>
                  ) : (
                    <div className="w-full h-48 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-sm">
                      No disponible
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EditContractDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        contractId={editingContractId}
        onContractUpdated={loadContracts}
      />

      {/* Reject Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={(open) => { if (!open) closeApproveDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aprobar Contrato #{approveTargetId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Referencia de pago inicial
              </label>
              <p className="text-xs text-gray-500 mt-0.5 mb-2">
                Esta referencia quedará registrada en el plan de pagos en las cuotas marcadas como pagadas.
              </p>
              <input
                type="text"
                placeholder="Ej: Recibo #001, Transferencia #XYZ..."
                value={approveReferencia}
                onChange={(e) => setApproveReferencia(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeApproveDialog}>
                Cancelar
              </Button>
              <Button
                className="bg-green-500 hover:bg-green-600"
                onClick={handleApprove}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Confirmar Aprobación
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={closeRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar Contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Observaciones del Rechazo</label>
              <Textarea
                placeholder="Ingrese las observaciones del rechazo..."
                value={rejectObservations}
                onChange={(e) => setRejectObservations(e.target.value)}
                className="mt-2"
                rows={5}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeRejectDialog}>
                Cancelar
              </Button>
              <Button
                className="bg-red-500 hover:bg-red-600"
                onClick={handleReject}
                disabled={loading || !rejectObservations.trim()}
              >
                {loading ? "Rechazando..." : "Rechazar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
