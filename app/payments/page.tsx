"use client"

import { useMemo } from "react"

import React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { exportToExcel } from "@/lib/export-excel"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Upload,
  Lock,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckSquare,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import Image from "next/image"
import type { PlanPagos } from "@/lib/db-types"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"

export default function PaymentsPage() {
  const [pagos, setPagos] = useState<PlanPagos[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [estadoFilter, setEstadoFilter] = useState<string>("all")
  const [confirmadoFilter, setConfirmadoFilter] = useState<string>("all")
  const [moraFilter, setMoraFilter] = useState<string>("all")
  const [contratoFilter, setContratoFilter] = useState<string>("")
  const [clienteFilter, setClienteFilter] = useState<string>("")
  const [clienteSearchInput, setClienteSearchInput] = useState<string>("")
  const [fechaPagoDesde, setFechaPagoDesde] = useState<string>("")
  const [fechaPagoHasta, setFechaPagoHasta] = useState<string>("")
  const [registradoPorFilter, setRegistradoPorFilter] = useState<string>("")
  const [aprobadoPorFilter, setAprobadoPorFilter] = useState<string>("")

  // Bulk selection state
  const [selectedPagos, setSelectedPagos] = useState<Set<number>>(new Set())
  const [confirmandoMasivo, setConfirmandoMasivo] = useState(false)
  const [confirmacionMasivaDialog, setConfirmacionMasivaDialog] = useState(false)
  const [passwordMasivo, setPasswordMasivo] = useState("")

  const [registrarPagoDialog, setRegistrarPagoDialog] = useState<{ open: boolean; pago: PlanPagos | null }>({
    open: false,
    pago: null,
  })
  const [confirmarPagoDialog, setConfirmarPagoDialog] = useState<{ open: boolean; pago: PlanPagos | null }>({
    open: false,
    pago: null,
  })
  const [verComprobanteDialog, setVerComprobanteDialog] = useState<{ open: boolean; url: string | null }>({
    open: false,
    url: null,
  })
  const [editarMontoDialog, setEditarMontoDialog] = useState<{ open: boolean; pago: PlanPagos | null }>({
    open: false,
    pago: null,
  })
  const [eliminarPagoDialog, setEliminarPagoDialog] = useState<{ open: boolean; pago: PlanPagos | null }>({
    open: false,
    pago: null,
  })
  const [nuevoMonto, setNuevoMonto] = useState("")
  const [passwordEditar, setPasswordEditar] = useState("")
  const [passwordEliminar, setPasswordEliminar] = useState("")
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null)
  const [comprobantePreview, setComprobantePreview] = useState<string | null>(null)
  const [referencia, setReferencia] = useState("")
  // Voucher/receipt date for the new pagoreferencia column (kept separate from
  // the reference number and from the system fecha_pago).
  const [fechaComprobante, setFechaComprobante] = useState("")
  const [referenciaValidada, setReferenciaValidada] = useState<{
    checked: boolean
    count: number
    duplicates: Array<{ contrato_id: number; numero_cuota: number; fecha_pago: string }>
  } | null>(null)
  const [validandoReferencia, setValidandoReferencia] = useState(false)
  const [reconfirmacionDialog, setReconfirmacionDialog] = useState<{
    open: boolean
    count: number
    duplicates: Array<{ contrato_id: number; numero_cuota: number; fecha_pago: string }>
  }>({ open: false, count: 0, duplicates: [] })
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [exportando, setExportando] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    setCurrentPage(1)
    setSelectedPagos(new Set()) // Clear selection on filter change
  }, [estadoFilter, confirmadoFilter, moraFilter, contratoFilter, clienteFilter, fechaPagoDesde, fechaPagoHasta, registradoPorFilter, aprobadoPorFilter])

  useEffect(() => {
    loadPagos()
  }, [selectedMonth, currentPage, estadoFilter, confirmadoFilter, moraFilter, contratoFilter, clienteFilter, fechaPagoDesde, fechaPagoHasta, registradoPorFilter, aprobadoPorFilter])

  const loadPagos = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("month", selectedMonth)
      params.append("page", currentPage.toString())

      console.log("[v0] Filter values:", {
        estadoFilter,
        confirmadoFilter,
        moraFilter,
        contratoFilter,
      })

      if (estadoFilter && estadoFilter !== "all") params.append("estado", estadoFilter)
      if (confirmadoFilter && confirmadoFilter !== "all") params.append("confirmado", confirmadoFilter)
      if (moraFilter && moraFilter !== "all") params.append("mora", moraFilter)
      if (contratoFilter && contratoFilter.trim()) params.append("contrato", contratoFilter.trim())
      if (clienteFilter && clienteFilter.trim()) params.append("cliente", clienteFilter.trim())
      if (fechaPagoDesde && fechaPagoDesde.trim()) params.append("fechaPagoDesde", fechaPagoDesde.trim())
      if (fechaPagoHasta && fechaPagoHasta.trim()) params.append("fechaPagoHasta", fechaPagoHasta.trim())
      if (registradoPorFilter && registradoPorFilter.trim()) params.append("registradoPor", registradoPorFilter.trim())
      if (aprobadoPorFilter && aprobadoPorFilter.trim()) params.append("aprobadoPor", aprobadoPorFilter.trim())

      console.log("[v0] API URL:", `/api/plan-pagos?${params.toString()}`)

      const response = await fetch(`/api/plan-pagos?${params.toString()}`)
      if (!response.ok) throw new Error("Error al cargar pagos")
      const data = await response.json()

      if (data.message && data.message.includes("out of range") && data.page === 1) {
        setCurrentPage(1)
        return
      }

      setPagos(data.payments || [])
      setTotalCount(data.total || 0)
      setTotalPages(Math.ceil((data.total || 0) / (data.limit || 50)))
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los pagos",
        variant: "destructive",
      })
      setPagos([])
      setTotalCount(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePagado = async (id: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/plan-pagos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagado: !currentValue, confirmado: false, comprobante: null, usuarioconfirma: null }),
      })

      if (!response.ok) throw new Error("Error al actualizar pago")
      await loadPagos()
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const handleValidarReferencia = async () => {
    if (!referencia.trim()) {
      toast({
        title: "Error",
        description: "Ingrese una referencia para validar",
        variant: "destructive",
      })
      return
    }

    setValidandoReferencia(true)
    try {
      const response = await fetch(`/api/plan-pagos/validar-referencia?referencia=${encodeURIComponent(referencia.trim())}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Error al validar referencia")
      }
      setReferenciaValidada({
        checked: true,
        count: data.count || 0,
        duplicates: data.duplicates || [],
      })
      
      if (data.count > 0) {
        toast({
          title: "Referencia Duplicada",
          description: `Esta referencia ya existe en ${data.count} pago(s)`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Referencia Validada",
          description: "Esta referencia no existe en el sistema",
        })
      }
    } catch (error) {
      console.error("[v0] Error validating reference:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo validar la referencia",
        variant: "destructive",
      })
    } finally {
      setValidandoReferencia(false)
    }
  }

  // Step 1: Triggered when the user clicks "Registrar Pago".
  // Validates the reference automatically. If duplicates exist, shows the
  // reconfirmation dialog. Otherwise, it proceeds to register the payment.
  const handleRegistrarPago = async () => {
    if (!registrarPagoDialog.pago || !comprobanteFile) {
      toast({
        title: "Error",
        description: "Debe seleccionar un comprobante",
        variant: "destructive",
      })
      return
    }

    // If a reference was provided, validate it first
    if (referencia.trim()) {
      setSubmitting(true)
      try {
        const response = await fetch(
          `/api/plan-pagos/validar-referencia?referencia=${encodeURIComponent(referencia.trim())}`,
        )
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Error al validar referencia")
        }

        const count = data.count || 0
        const duplicates = data.duplicates || []

        setReferenciaValidada({ checked: true, count, duplicates })

        if (count > 0) {
          // Duplicates found: open the reconfirmation dialog and stop here.
          setReconfirmacionDialog({ open: true, count, duplicates })
          setSubmitting(false)
          return
        }
      } catch (error: any) {
        console.error("[v0] Error validating reference:", error)
        toast({
          title: "Error",
          description: error.message || "No se pudo validar la referencia",
          variant: "destructive",
        })
        setSubmitting(false)
        return
      }
    }

    // No reference provided or no duplicates found -> submit payment
    await submitPago()
  }

  // Step 2: Actually submits the payment to the backend. Called either
  // directly from handleRegistrarPago (no duplicates) or from the
  // reconfirmation dialog when the user accepts registering anyway.
  const submitPago = async () => {
    if (!registrarPagoDialog.pago || !comprobanteFile) return

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("comprobante", comprobanteFile)
      formData.append("referencia", referencia)
      formData.append("pagoreferencia", fechaComprobante || "")
      formData.append("usuariopago", user?.full_name || "")

      const response = await fetch(`/api/plan-pagos/${registrarPagoDialog.pago.id}/registrar-pago`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error desconocido" }))
        throw new Error(errorData.error || `Error: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("[v0] Payment registered:", data)

      toast({
        title: "Éxito",
        description: "Pago registrado correctamente",
      })

      setRegistrarPagoDialog({ open: false, pago: null })
      setComprobanteFile(null)
      setComprobantePreview(null)
      setReferencia("")
      setFechaComprobante("")
      setReferenciaValidada(null)
      setReconfirmacionDialog({ open: false, count: 0, duplicates: [] })
      await loadPagos()
    } catch (error: any) {
      console.error("[v0] Error registering payment:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el pago",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Called when the user confirms the reconfirmation dialog
  const handleConfirmarReconfirmacion = async () => {
    setReconfirmacionDialog({ open: false, count: 0, duplicates: [] })
    await submitPago()
  }

  const handleConfirmarPago = async () => {
    if (!confirmarPagoDialog.pago) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/plan-pagos/${confirmarPagoDialog.pago.id}/confirmar-pago`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, usuarioConfirma: user?.full_name || "" }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al confirmar pago")
      }

      toast({
        title: "Éxito",
        description: "Pago confirmado correctamente",
      })

      setConfirmarPagoDialog({ open: false, pago: null })
      setPassword("")
      await loadPagos()
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo confirmar el pago",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Bulk confirmation handler
  const handleConfirmarMasivo = async () => {
    if (selectedPagos.size === 0) return

    setConfirmandoMasivo(true)
    try {
      const response = await fetch("/api/plan-pagos/confirmar-masivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedPagos),
          password: passwordMasivo,
          usuarioConfirma: user?.full_name || "",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al confirmar pagos")
      }

      const data = await response.json()
      
      toast({
        title: "Exito",
        description: `${data.count} pagos confirmados correctamente`,
      })

      setConfirmacionMasivaDialog(false)
      setPasswordMasivo("")
      setSelectedPagos(new Set())
      await loadPagos()
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudieron confirmar los pagos",
        variant: "destructive",
      })
    } finally {
      setConfirmandoMasivo(false)
    }
  }

  // Get pagos that can be confirmed (pagado but not confirmado)
  const pagosParaConfirmar = pagos.filter(p => p.pagado && p.confirmado !== "si")
  
  // Toggle single selection
  const togglePagoSelection = (pagoId: number) => {
    const newSelection = new Set(selectedPagos)
    if (newSelection.has(pagoId)) {
      newSelection.delete(pagoId)
    } else {
      newSelection.add(pagoId)
    }
    setSelectedPagos(newSelection)
  }

  // Toggle all confirmable pagos selection
  const toggleSelectAll = () => {
    if (selectedPagos.size === pagosParaConfirmar.length) {
      setSelectedPagos(new Set())
    } else {
      setSelectedPagos(new Set(pagosParaConfirmar.map(p => p.id)))
    }
  }

  const handleEditarMonto = async () => {
    if (!editarMontoDialog.pago || !nuevoMonto) {
      toast({
        title: "Error",
        description: "Debe ingresar un monto válido",
        variant: "destructive",
      })
      return
    }

    if (!passwordEditar) {
      toast({
        title: "Error",
        description: "Debe ingresar la contraseña",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/plan-pagos/${editarMontoDialog.pago.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto_esperado: parseFloat(nuevoMonto), password: passwordEditar }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al actualizar monto")
      }

      toast({
        title: "Éxito",
        description: "Monto actualizado correctamente",
      })

      setEditarMontoDialog({ open: false, pago: null })
      setNuevoMonto("")
      setPasswordEditar("")
      await loadPagos()
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el monto",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEliminarPago = async () => {
    if (!eliminarPagoDialog.pago) return

    if (!passwordEliminar) {
      toast({
        title: "Error",
        description: "Debe ingresar la contraseña",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/plan-pagos/${eliminarPagoDialog.pago.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pagado: false,
          confirmado: null,
          comprobante: null,
          fecha_pago: null,
          referencia: null,
          usuariopago: null,
          usuarioconfirma: null,
          password: passwordEliminar,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al eliminar pago")
      }

      toast({
        title: "Éxito",
        description: "Pago eliminado correctamente (línea mantenida para re-registro)",
      })

      setEliminarPagoDialog({ open: false, pago: null })
      setPasswordEliminar("")
      await loadPagos()
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el pago",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date().toISOString().split("T")[0]

  const pagosPendientes = pagos.filter((p) => !p.pagado)
  const pagosRealizados = pagos.filter((p) => p.pagado)
  const pagosAtrasados = pagos.filter((p) => !p.pagado && p.fecha_vencimiento < today)

  const totalPendiente = pagosPendientes.reduce((sum, p) => sum + Number(p.monto_esperado), 0)
  const totalRealizado = pagosRealizados.reduce((sum, p) => sum + Number(p.monto_esperado), 0)
  const totalAtrasado = pagosAtrasados.reduce((sum, p) => sum + Number(p.monto_esperado), 0)

  // Generate month options (last 6 months and next 6 months)
  const monthOptions = useMemo(() => {
    const options = []
    const today = new Date()
    
    for (let i = -6; i <= 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const label = date.toLocaleDateString("es-HN", { month: "long", year: "numeric" })
      options.push({ value, label })
    }
    
    return options
  }, [])

  // Formats the voucher date (pagoreferencia) as DD/MM/YYYY. Returns "-" when
  // empty (e.g. older payments registered before this column existed).
  const formatPagoReferencia = (value: string | null | undefined) => {
    if (!value) return "-"
    const datePart = String(value).split("T")[0]
    const [y, m, d] = datePart.split("-")
    if (!y || !m || !d) return String(value)
    return `${d}/${m}/${y}`
  }

  const getMoraAlert = (fechaVencimiento: string, pagado: boolean) => {
    if (pagado) return null

    const today = new Date()
    const vencimiento = new Date(fechaVencimiento)
    const diffTime = today.getTime() - vencimiento.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return null // No vencido aún
    if (diffDays <= 30) return "Pendiente" // 0-30 días: Pendiente
    return "Cortar" // 30+ días: Cortar
  }

  const handleSearchCliente = () => {
    setClienteFilter(clienteSearchInput)
    setCurrentPage(1)
  }

  const handleKeyPressCliente = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearchCliente()
    }
  }

  const handleExportarExcel = async () => {
    try {
      setExportando(true)
      
      // Build API URL with all filters but no pagination
      const buildParams = () => {
        const params = new URLSearchParams()
        params.append("month", selectedMonth)
        params.append("exportAll", "true")
        
        if (estadoFilter && estadoFilter !== "all") params.append("estado", estadoFilter)
        if (confirmadoFilter && confirmadoFilter !== "all") params.append("confirmado", confirmadoFilter)
        if (moraFilter && moraFilter !== "all") params.append("mora", moraFilter)
        if (contratoFilter && contratoFilter.trim()) params.append("contrato", contratoFilter.trim())
        if (clienteFilter && clienteFilter.trim()) params.append("cliente", clienteFilter.trim())
        if (fechaPagoDesde && fechaPagoDesde.trim()) params.append("fechaPagoDesde", fechaPagoDesde.trim())
        if (fechaPagoHasta && fechaPagoHasta.trim()) params.append("fechaPagoHasta", fechaPagoHasta.trim())
        if (registradoPorFilter && registradoPorFilter.trim()) params.append("registradoPor", registradoPorFilter.trim())
        if (aprobadoPorFilter && aprobadoPorFilter.trim()) params.append("aprobadoPor", aprobadoPorFilter.trim())

        return params
      }

      console.log("[v0] Starting export of all filtered data...")
      
      // Fetch all data in chunks
      const allPagos: PlanPagos[] = []
      let currentChunk = 0
      let hasMore = true
      let totalRecords = 0
      
      while (hasMore) {
        const params = buildParams()
        params.append("chunk", String(currentChunk))
        
        console.log(`[v0] Fetching chunk ${currentChunk}...`)
        
        const response = await fetch(`/api/plan-pagos?${params.toString()}`)
        
        if (!response.ok) {
          throw new Error("No se pudo obtener los datos para exportar")
        }

        const data = await response.json()
        const chunkData = data.data || []
        totalRecords = data.total || 0
        
        allPagos.push(...chunkData)
        console.log(`[v0] Chunk ${currentChunk}: ${chunkData.length} records. Total: ${allPagos.length}/${totalRecords}`)
        
        hasMore = data.hasMore === true && chunkData.length > 0
        currentChunk++
        
        // Show progress
        if (hasMore) {
          toast({
            title: "Exportando...",
            description: `Procesado: ${allPagos.length} de ${totalRecords} registros`,
          })
        }
      }

      if (allPagos.length === 0) {
        toast({
          title: "Sin datos",
          description: "No hay pagos para exportar con los filtros aplicados",
        })
        setExportando(false)
        return
      }

      console.log(`[v0] Export complete: ${allPagos.length} total records`)

      const headers = [
        "Contrato ID",
        "Cliente",
        "Cuota",
        "Fecha Vencimiento",
        "Fecha Pago",
        "Referencia",
        "Fecha Referencia",
        "Registrado Por",
        "Aprobado Por",
        "Monto (L)",
        "Pagado",
        "Confirmado",
      ]

      const rows = allPagos.map((pago: PlanPagos) => [
        pago.contrato_id,
        pago.cliente || "N/A",
        pago.numero_cuota,
        pago.fecha_vencimiento,
        pago.fecha_pago || "-",
        pago.referencia || "-",
        formatPagoReferencia(pago.pagoreferencia),
        pago.usuariopago || "-",
        pago.usuarioconfirma || "-",
        Number(pago.monto_esperado),
        pago.pagado ? "Sí" : "No",
        pago.confirmado === "si" ? "Sí" : "No",
      ])

      exportToExcel({
        filename: `pagos_${new Date().toISOString().split("T")[0]}`,
        sheetName: "Pagos",
        headers,
        rows,
      })

      toast({
        title: "Éxito",
        description: `${allPagos.length} pagos exportados correctamente`,
      })
    } catch (error: any) {
      console.error("[v0] Error exporting to CSV:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo descargar el archivo",
        variant: "destructive",
      })
    } finally {
      setExportando(false)
    }
  }

  const handleFileSelect = async (file: File) => {
    try {
      const compressed = await new Promise<File>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const img = document.createElement("img")
          img.onload = () => {
            const canvas = document.createElement("canvas")
            let width = img.width
            let height = img.height
            const maxSize = 1200

            if (width > height && width > maxSize) {
              height = (height * maxSize) / width
              width = maxSize
            } else if (height > maxSize) {
              width = (width * maxSize) / height
              height = maxSize
            }

            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext("2d")
            ctx?.drawImage(img, 0, 0, width, height)

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(new File([blob], file.name, { type: "image/jpeg" }))
                }
              },
              "image/jpeg",
              0.75,
            )
          }
          img.src = e.target?.result as string
        }
        reader.readAsDataURL(file)
      })

      setComprobanteFile(compressed)
      setComprobantePreview(URL.createObjectURL(compressed))
    } catch (error) {
      console.error("Error compressing image:", error)
      setComprobanteFile(file)
      setComprobantePreview(URL.createObjectURL(file))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    )
  }

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <div className="mb-4 md:mb-6">
        <Button variant="ghost" asChild className="text-gray-600 hover:text-gray-900 text-sm md:text-base">
          <Link href="/dashboard">
            <ArrowLeft className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            Volver
          </Link>
        </Button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Módulo de Cobros</h1>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Estado de Pago</Label>
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Confirmación</Label>
              <Select value={confirmadoFilter} onValueChange={setConfirmadoFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="si">Confirmado</SelectItem>
                  <SelectItem value="no">Sin Confirmar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Alerta de Mora</Label>
              <Select value={moraFilter} onValueChange={setMoraFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Pendiente">Pendiente (0-30 días)</SelectItem>
                  <SelectItem value="Cortar">Cortar (30+ días)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Número de Contrato</Label>
              <Input
                type="number"
                placeholder="Ej: 1024"
                value={contratoFilter}
                onChange={(e) => setContratoFilter(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs">Nombre del Cliente</Label>
                <Input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={clienteSearchInput}
                  onChange={(e) => setClienteSearchInput(e.target.value)}
                  onKeyPress={handleKeyPressCliente}
                  className="h-9"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSearchCliente}
                  variant="outline"
                  className="h-9 bg-transparent"
                >
                  Buscar
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs">Fecha de Pago Desde</Label>
              <Input
                type="date"
                value={fechaPagoDesde}
                onChange={(e) => setFechaPagoDesde(e.target.value)}
                className="h-9"
              />
            </div>

            <div>
              <Label className="text-xs">Fecha de Pago Hasta</Label>
              <Input
                type="date"
                value={fechaPagoHasta}
                onChange={(e) => setFechaPagoHasta(e.target.value)}
                className="h-9"
              />
            </div>

            <div>
              <Label className="text-xs">Registrado Por</Label>
              <Input
                type="text"
                placeholder="Nombre usuario..."
                value={registradoPorFilter}
                onChange={(e) => setRegistradoPorFilter(e.target.value)}
                className="h-9"
              />
            </div>

            <div>
              <Label className="text-xs">Aprobado Por</Label>
              <Input
                type="text"
                placeholder="Nombre usuario..."
                value={aprobadoPorFilter}
                onChange={(e) => setAprobadoPorFilter(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600">Pagos Pendientes</p>
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl text-yellow-600">{pagosPendientes.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">L {totalPendiente.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600">Pagos Realizados</p>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-600">{pagosRealizados.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">L {totalRealizado.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600">Pagos Atrasados</p>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-600">{pagosAtrasados.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">L {totalAtrasado.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Lista de Pagos - {monthOptions.find((m) => m.value === selectedMonth)?.label}
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Total: {totalCount} pagos</span>
              {selectedPagos.size > 0 && (
                <Button
                  onClick={() => setConfirmacionMasivaDialog(true)}
                  className="text-xs bg-green-600 hover:bg-green-700"
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Confirmar ({selectedPagos.size})
                </Button>
              )}
              <Button
                onClick={handleExportarExcel}
                disabled={pagos.length === 0 || exportando}
                variant="outline"
                className="text-xs bg-transparent"
              >
                <Download className="w-4 h-4 mr-2" />
                {exportando ? "Exportando..." : "Exportar Excel"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-1.5 text-center font-medium text-gray-600">
                    <Checkbox
                      checked={pagosParaConfirmar.length > 0 && selectedPagos.size === pagosParaConfirmar.length}
                      onCheckedChange={toggleSelectAll}
                      disabled={pagosParaConfirmar.length === 0}
                    />
                  </th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-600">Contrato</th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-600">Cliente</th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-600">Cuota</th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-600">Vencimiento</th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-600">Fecha Pago</th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-600">Referencia</th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-600">Fecha Referencia</th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-600">Registrado Por</th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-600">Aprobado Por</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-600">Monto</th>
                  <th className="px-2 py-1.5 text-center font-medium text-gray-600">Estado</th>
                  <th className="px-2 py-1.5 text-center font-medium text-gray-600">Alerta Mora</th>
                  <th className="px-2 py-1.5 text-center font-medium text-gray-600">Confirmado</th>
                  <th className="px-2 py-1.5 text-center font-medium text-gray-600">Comprobante</th>
                  <th className="px-2 py-1.5 text-center font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pagos.length > 0 ? (
                  pagos.map((pago) => {
                    const moraAlert = getMoraAlert(pago.fecha_vencimiento, pago.pagado)
                    let rowBgClass = ""
                    if (moraAlert === "Pendiente") rowBgClass = "bg-yellow-100"
                    else if (moraAlert === "Cortar") rowBgClass = "bg-red-200"

                      const canBeSelected = pago.pagado && pago.confirmado !== "si"
                      
                      return (
                      <tr key={pago.id} className={rowBgClass}>
                        <td className="px-2 py-2 text-center whitespace-nowrap">
                          {canBeSelected ? (
                            <Checkbox
                              checked={selectedPagos.has(pago.id)}
                              onCheckedChange={() => togglePagoSelection(pago.id)}
                            />
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">{pago.contrato_id}</td>
                        <td className="px-2 py-2 whitespace-nowrap text-sm">
                          {pago.cliente || "N/A"}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">{pago.numero_cuota}/12</td>
                        <td className="px-2 py-2 whitespace-nowrap">{pago.fecha_vencimiento}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{pago.fecha_pago || "-"}</td>
                        <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-700">
                          {pago.referencia || "-"}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-700">
                          {formatPagoReferencia(pago.pagoreferencia)}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-600">
                          {pago.usuariopago || "-"}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-600">
                          {pago.usuarioconfirma || "-"}
                        </td>
                        <td className="px-2 py-2 text-right font-medium whitespace-nowrap">
                          L {Number(pago.monto_esperado).toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">
                          {pago.pagado ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-green-100 text-green-700">
                              Pagado
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] ${
                                moraAlert ? "bg-white/50" : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {moraAlert ? "Atrasado" : "Pendiente"}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">
                          {moraAlert === "Pendiente" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-yellow-500 text-white">
                              Pendiente
                            </span>
                          )}
                          {moraAlert === "Cortar" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-red-600 text-white">
                              Cortar
                            </span>
                          )}
                          {!moraAlert && <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">
                          {pago.confirmado === "si" ? (
                            <CheckCircle className="w-3 h-3 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-3 h-3 text-gray-300 mx-auto" />
                          )}
                        </td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">
                          {pago.comprobante ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-[10px] px-2 py-1 h-6"
                              onClick={() => setVerComprobanteDialog({ open: true, url: pago.comprobante })}
                            >
                              <ImageIcon className="w-3 h-3" />
                            </Button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">
                          <div className="flex gap-1 justify-center flex-wrap">
                            {!pago.pagado && (
                              <Button
                                size="sm"
                                variant="default"
                                className="text-[10px] px-2 py-1 h-6"
                                onClick={() => setRegistrarPagoDialog({ open: true, pago })}
                              >
                                <Upload className="w-3 h-3 mr-1" />
                                Registrar
                              </Button>
                            )}
                            {pago.pagado && pago.confirmado !== "si" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[10px] px-2 py-1 h-6 bg-transparent"
                                onClick={() => setConfirmarPagoDialog({ open: true, pago })}
                              >
                                <Lock className="w-3 h-3 mr-1" />
                                Confirmar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] px-2 py-1 h-6 bg-blue-50 text-blue-600 border-blue-200"
                              onClick={() => {
                                setEditarMontoDialog({ open: true, pago })
                                setNuevoMonto(pago.monto_esperado.toString())
                              }}
                            >
                              Editar
                            </Button>
                            <Button
  size="sm"
  variant="outline"
  className="text-[10px] px-2 py-1 h-6 bg-red-50 text-red-600 border-red-200"
  onClick={() => setEliminarPagoDialog({ open: true, pago })}
  >
  Borrar pago
  </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={15} className="px-4 py-8 text-center text-gray-500">
                      No hay pagos para los filtros seleccionados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-600">
                Página {currentPage} de {totalPages} ({totalCount} total)
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={registrarPagoDialog.open}
        onOpenChange={(open) => {
          setRegistrarPagoDialog({ open, pago: null })
          if (!open) {
            setComprobanteFile(null)
            setComprobantePreview(null)
            setReferencia("")
            setReferenciaValidada(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Registrar Pago</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Suba el comprobante de pago para el contrato {registrarPagoDialog.pago?.contrato_id}, cuota{" "}
              {registrarPagoDialog.pago?.numero_cuota}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label className="text-sm">Comprobante de Pago</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-20 flex flex-col items-center justify-center gap-2 bg-transparent"
                  onClick={() => {
                    const input = document.createElement("input")
                    input.type = "file"
                    input.accept = "image/*"
                    input.capture = "environment"
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) handleFileSelect(file)
                    }
                    input.click()
                  }}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-xs">Tomar Foto</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-20 flex flex-col items-center justify-center gap-2 bg-transparent"
                  onClick={() => {
                    const input = document.createElement("input")
                    input.type = "file"
                    input.accept = "image/*"
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) handleFileSelect(file)
                    }
                    input.click()
                  }}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-xs">Galería/Archivo</span>
                </Button>
              </div>
              {comprobanteFile && (
                <div className="space-y-2">
                  {comprobantePreview && (
                    <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                      <Image
                        src={comprobantePreview || "/placeholder.svg"}
                        alt="Preview"
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <div className="text-xs text-gray-600 text-center">
                    {comprobanteFile.name} ({(comprobanteFile.size / 1024).toFixed(2)} KB)
                  </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setRegistrarPagoDialog({ open: false, pago: null })
                  setComprobanteFile(null)
                  setComprobantePreview(null)
                  setReferencia("")
                }}
              >
                    Cambiar imagen
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Referencia (Opcional)</Label>
              <Input
                type="text"
                placeholder="Número de referencia, transferencia, etc."
                value={referencia}
                onChange={(e) => {
                  setReferencia(e.target.value)
                  setReferenciaValidada(null) // Clear validation when reference changes
                }}
                className="text-sm"
              />
              <p className="text-[11px] text-gray-500 italic">
                La referencia se validara automaticamente al registrar el pago.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Fecha de la Referencia / Recibo (Opcional)</Label>
              <Input
                type="date"
                value={fechaComprobante}
                onChange={(e) => setFechaComprobante(e.target.value)}
                className="text-sm"
              />
              <p className="text-[11px] text-gray-500 italic">
                Fecha del voucher del cliente. Se guarda aparte y no modifica la fecha de registro
                del sistema.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRegistrarPagoDialog({ open: false, pago: null })
                setComprobanteFile(null)
                setComprobantePreview(null)
                setReferencia("")
                setFechaComprobante("")
                setReferenciaValidada(null)
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleRegistrarPago} disabled={!comprobanteFile || submitting}>
              {submitting ? "Validando..." : "Registrar Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Reconfirmacion: aparece si la referencia ya existe al intentar registrar el pago */}
      <Dialog
        open={reconfirmacionDialog.open}
        onOpenChange={(open) => {
          if (!open) setReconfirmacionDialog({ open: false, count: 0, duplicates: [] })
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="w-5 h-5" />
              Referencia Duplicada
            </DialogTitle>
            <DialogDescription>
              La referencia ingresada ya existe en{" "}
              <span className="font-semibold">
                {reconfirmacionDialog.count} pago{reconfirmacionDialog.count > 1 ? "s" : ""}
              </span>{" "}
              del sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1">
              <div className="font-semibold mb-1">Coincidencias encontradas:</div>
              {reconfirmacionDialog.duplicates.slice(0, 5).map((dup, idx) => (
                <div key={idx}>
                  Contrato #{dup.contrato_id}, Cuota {dup.numero_cuota} &mdash; Pagado: {dup.fecha_pago}
                </div>
              ))}
              {reconfirmacionDialog.duplicates.length > 5 && (
                <div className="italic">...y {reconfirmacionDialog.duplicates.length - 5} mas</div>
              )}
            </div>
            <p className="text-sm text-gray-700">
              Desea registrar este pago de todos modos como una <span className="font-semibold">reconfirmacion</span>?
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReconfirmacionDialog({ open: false, count: 0, duplicates: [] })}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarReconfirmacion}
              disabled={submitting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {submitting ? "Registrando..." : "Si, registrar como reconfirmacion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmarPagoDialog.open} onOpenChange={(open) => setConfirmarPagoDialog({ open, pago: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pago</DialogTitle>
            <DialogDescription>
              Ingrese la contraseña para confirmar el pago del contrato {confirmarPagoDialog.pago?.contrato_id}, cuota{" "}
              {confirmarPagoDialog.pago?.numero_cuota}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese contraseña"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmarPagoDialog({ open: false, pago: null })
                setPassword("")
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmarPago} disabled={!password || submitting}>
              {submitting ? "Confirmando..." : "Confirmar Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={verComprobanteDialog.open} onOpenChange={(open) => setVerComprobanteDialog({ open, url: null })}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Comprobante de Pago</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-96">
            {verComprobanteDialog.url && (
              <Image
                src={verComprobanteDialog.url || "/placeholder.svg"}
                alt="Comprobante de pago"
                fill
                className="object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editarMontoDialog.open}
        onOpenChange={(open) => {
          setEditarMontoDialog({ open, pago: null })
          if (!open) {
            setNuevoMonto("")
            setPasswordEditar("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Editar Monto de Cuota</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Editar el monto de la cuota {editarMontoDialog.pago?.numero_cuota} del contrato{" "}
              {editarMontoDialog.pago?.contrato_id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nuevo-monto" className="text-sm">
                Nuevo Monto (L)
              </Label>
              <Input
                id="nuevo-monto"
                type="number"
                step="0.01"
                value={nuevoMonto}
                onChange={(e) => setNuevoMonto(e.target.value)}
                placeholder="Ingrese el nuevo monto"
                className="text-sm"
              />
            </div>
            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
              <strong>Monto actual:</strong> L {editarMontoDialog.pago?.monto_esperado.toFixed(2)}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-editar" className="text-sm flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Contraseña
              </Label>
              <Input
                id="password-editar"
                type="password"
                value={passwordEditar}
                onChange={(e) => setPasswordEditar(e.target.value)}
                placeholder="Ingrese contraseña para confirmar"
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditarMontoDialog({ open: false, pago: null })
                setNuevoMonto("")
                setPasswordEditar("")
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditarMonto} disabled={!nuevoMonto || !passwordEditar || submitting}>
              {submitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Payment Dialog */}
      <Dialog
        open={eliminarPagoDialog.open}
        onOpenChange={(open) => {
          setEliminarPagoDialog({ open, pago: null })
          if (!open) setPasswordEliminar("")
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg text-red-600">Eliminar Pago</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Esta accion eliminara el registro de pago del contrato {eliminarPagoDialog.pago?.contrato_id}, cuota{" "}
              {eliminarPagoDialog.pago?.numero_cuota}. La linea se mantendra para re-registro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">
                Se eliminara: Comprobante, fecha de pago, referencia y confirmacion
              </p>
              <p className="text-xs text-red-600 mt-1">
                Esta accion no se puede deshacer.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-eliminar" className="text-sm flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Contraseña
              </Label>
              <Input
                id="password-eliminar"
                type="password"
                value={passwordEliminar}
                onChange={(e) => setPasswordEliminar(e.target.value)}
                placeholder="Ingrese contraseña para confirmar"
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEliminarPagoDialog({ open: false, pago: null })
                setPasswordEliminar("")
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleEliminarPago} 
              disabled={!passwordEliminar || submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? "Eliminando..." : "Eliminar Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Confirmation Dialog */}
      <Dialog open={confirmacionMasivaDialog} onOpenChange={(open) => {
        setConfirmacionMasivaDialog(open)
        if (!open) setPasswordMasivo("")
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmacion Masiva de Pagos</DialogTitle>
            <DialogDescription>
              Esta a punto de confirmar {selectedPagos.size} pago(s) seleccionado(s). 
              Ingrese la contrasena para confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800 font-medium">
                Pagos a confirmar: {selectedPagos.size}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                Esta accion no se puede deshacer.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-masivo">Contrasena</Label>
              <Input
                id="password-masivo"
                type="password"
                value={passwordMasivo}
                onChange={(e) => setPasswordMasivo(e.target.value)}
                placeholder="Ingrese contrasena"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmacionMasivaDialog(false)
                setPasswordMasivo("")
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarMasivo} 
              disabled={!passwordMasivo || confirmandoMasivo}
              className="bg-green-600 hover:bg-green-700"
            >
              {confirmandoMasivo ? "Confirmando..." : `Confirmar ${selectedPagos.size} Pagos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
