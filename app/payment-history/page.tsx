"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, DollarSign, CheckCircle, XCircle, AlertCircle, Search, X, Edit2, Power, Loader2, Receipt, MessageSquare, ImageIcon, Lock, Upload } from "lucide-react"
import type { PlanPagos, Contrato } from "@/lib/db-types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"

interface PaqueteOption {
  id: number
  nombre: string
}

interface Cliente {
  id: number
  nombre_completo: string
  contrato_id: number | null
}

// Map a YYYY-MM-DD style date to its Spanish month name (e.g. "Enero").
// Returns "-" when the input is missing or unparseable so the column never
// renders raw "undefined" / "Invalid Date" text in the table.
const MESES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]
function getMesNombre(val: string | null | undefined): string {
  if (!val) return "-"
  const m = String(val).slice(0, 10).split("-")[1]
  const idx = parseInt(m, 10) - 1
  if (Number.isNaN(idx) || idx < 0 || idx > 11) return "-"
  return MESES_ES[idx]
}

export default function PaymentHistoryPage() {
  const { user } = useAuth()
  const [contratoInfo, setContratoInfo] = useState<Contrato | null>(null)
  const { toast } = useToast()
  // Package catalog + saving flag for the editable "Paquete" field
  const [paquetes, setPaquetes] = useState<PaqueteOption[]>([])
  const [savingPaquete, setSavingPaquete] = useState(false)
  const [pagos, setPagos] = useState<PlanPagos[]>([])
  const [searchContrato, setSearchContrato] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [selectedContrato, setSelectedContrato] = useState<string>("")
  const [searchClienteName, setSearchClienteName] = useState<string>("")
  // When the selected cliente owns more than one contract we keep the full
  // list here so the user can switch between them via a selector instead of
  // being silently locked into the first one.
  const [contratosCliente, setContratosCliente] = useState<Contrato[]>([])
  const [clienteSeleccionadoNombre, setClienteSeleccionadoNombre] = useState<string>("")
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([])
  const [clienteSearchFilter, setClienteSearchFilter] = useState<string>("")
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [clienteCurrentPage, setClienteCurrentPage] = useState<number>(1)
  const [totalClientePages, setTotalClientePages] = useState<number>(0)
  const [showEditNameDialog, setShowEditNameDialog] = useState(false)
  const [newClienteName, setNewClienteName] = useState<string>("")
  const [updatingName, setUpdatingName] = useState(false)
  const [showEditPaqueteDialog, setShowEditPaqueteDialog] = useState(false)
  const [newPaquete, setNewPaquete] = useState<string>("")
  const clientesPerPage = 10; // Define clientesPerPage

  // Inactivar cuotas state
  const [showInactivarDialog, setShowInactivarDialog] = useState(false)
  const [selectedCuotasInactivar, setSelectedCuotasInactivar] = useState<Set<number>>(new Set())
  const [procesandoInactivar, setProcesandoInactivar] = useState(false)
  const [comentarioInactivar, setComentarioInactivar] = useState<string>("")
  // Password required to inactivate cuotas (same admin password used for
  // deleting payments, editing montos, etc.).
  const [passwordInactivar, setPasswordInactivar] = useState<string>("")

  // Activar (re-enable) cuotas state — opens a dedicated dialog instead of
  // a window.prompt so we can also ask for the admin password.
  const [activarDialog, setActivarDialog] = useState<{
    open: boolean
    ids: number[]
  }>({ open: false, ids: [] })
  const [comentarioActivar, setComentarioActivar] = useState<string>("")
  const [passwordActivar, setPasswordActivar] = useState<string>("")

  // Edit comentario per cuota — opens a small dialog from the table row.
  // Comentario edits are not destructive so they don't require the admin
  // password (PATCH /api/plan-pagos/:id only enforces it for monto/pagado).
  const [comentarioDialog, setComentarioDialog] = useState<{
    open: boolean
    pagoId: number | null
    text: string
    saving: boolean
  }>({ open: false, pagoId: null, text: "", saving: false })

  // Bulk-change the monthly amount for ALL unpaid cuotas of the contract.
  // Same admin password used elsewhere (deleting payments, editing montos).
  const [cambiarMontoDialog, setCambiarMontoDialog] = useState<{
    open: boolean
    monto: string
    password: string
    saving: boolean
  }>({ open: false, monto: "", password: "", saving: false })

  // View comprobante image inline. Mirrors the same dialog used on the
  // payments page so users get a consistent preview experience instead of
  // having to open the storage URL in a separate tab.
  const [verComprobanteDialog, setVerComprobanteDialog] = useState<{
    open: boolean
    url: string | null
  }>({ open: false, url: null })

  // Confirm payment dialog (mirrors /payments). Confirming a payment marks
  // it as approved by the admin — same endpoint, same password requirement,
  // same DB effect (sets `confirmado = "si"`).
  const [confirmarPagoDialog, setConfirmarPagoDialog] = useState<{
    open: boolean
    pago: PlanPagos | null
  }>({ open: false, pago: null })
  const [confirmarPassword, setConfirmarPassword] = useState("")
  const [confirmandoPago, setConfirmandoPago] = useState(false)

  // Register payment dialog (mirrors /payments). Lets the user upload a
  // comprobante for an unpaid cuota right from the history view, hitting the
  // same backend route so the DB effect (pagado=true, comprobante URL,
  // fecha_pago, horapago, referencia, usuariopago) is identical.
  const [registrarPagoDialog, setRegistrarPagoDialog] = useState<{
    open: boolean
    pago: PlanPagos | null
  }>({ open: false, pago: null })
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null)
  const [comprobantePreview, setComprobantePreview] = useState<string | null>(null)
  const [referencia, setReferencia] = useState("")
  // Date printed on the physical voucher / transfer slip. It is only used to
  // build the stored referencia string; it does NOT affect fecha_pago (the
  // system processing date set server-side).
  const [fechaComprobante, setFechaComprobante] = useState("")
  const [submittingPago, setSubmittingPago] = useState(false)
  // Reconfirmation dialog: shown when a duplicate referencia is detected.
  const [reconfirmacionDialog, setReconfirmacionDialog] = useState<{
    open: boolean
    count: number
    duplicates: Array<{ contrato_id: number; numero_cuota: number; fecha_pago: string }>
  }>({ open: false, count: 0, duplicates: [] })

  // Compress the picked image to ~1200px max edge / 75% jpg quality before
  // upload, identical to the /payments flow. Cuts upload size dramatically
  // for phone photos without losing legibility for tellers reviewing them.
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
                if (blob) resolve(new File([blob], file.name, { type: "image/jpeg" }))
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
      console.error("[v0] Error compressing image:", error)
      setComprobanteFile(file)
      setComprobantePreview(URL.createObjectURL(file))
    }
  }

  const resetRegistrarPagoDialog = () => {
    setRegistrarPagoDialog({ open: false, pago: null })
    setComprobanteFile(null)
    setComprobantePreview(null)
    setReferencia("")
    setFechaComprobante("")
  }

  // Step 1 — validate referencia (if provided). Pop reconfirmation dialog if
  // duplicates exist; otherwise submit straight away. Mirrors /payments.
  const handleRegistrarPago = async () => {
    if (!registrarPagoDialog.pago || !comprobanteFile) {
      alert("Debe seleccionar un comprobante")
      return
    }

    if (referencia.trim()) {
      setSubmittingPago(true)
      try {
        const response = await fetch(
          `/api/plan-pagos/validar-referencia?referencia=${encodeURIComponent(referencia.trim())}`,
        )
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Error al validar referencia")
        const count = data.count || 0
        const duplicates = data.duplicates || []
        if (count > 0) {
          setReconfirmacionDialog({ open: true, count, duplicates })
          setSubmittingPago(false)
          return
        }
      } catch (error: any) {
        console.error("[v0] Error validating reference:", error)
        alert(error.message || "No se pudo validar la referencia")
        setSubmittingPago(false)
        return
      }
    }

    await submitPago()
  }

  // Step 2 — actually upload the comprobante and persist the payment.
  const submitPago = async () => {
    if (!registrarPagoDialog.pago || !comprobanteFile) return
    setSubmittingPago(true)
    try {
      const formData = new FormData()
      formData.append("comprobante", comprobanteFile)
      formData.append("referencia", referencia)
      // Voucher/receipt date goes to its own column (pagoreferencia), kept
      // separate from the reference number and from the system fecha_pago.
      formData.append("pagoreferencia", fechaComprobante || "")
      formData.append("usuariopago", user?.full_name || "")

      const response = await fetch(
        `/api/plan-pagos/${registrarPagoDialog.pago.id}/registrar-pago`,
        { method: "POST", body: formData },
      )
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Error: ${response.statusText}`)
      }

      alert("Pago registrado correctamente")
      resetRegistrarPagoDialog()
      setReconfirmacionDialog({ open: false, count: 0, duplicates: [] })
      // Refresh table so the new pagado/comprobante values appear immediately.
      if (contratoInfo) {
        await loadPaymentHistory(String(contratoInfo.id))
      }
    } catch (error: any) {
      console.error("[v0] Error registering payment:", error)
      alert(error.message || "No se pudo registrar el pago")
    } finally {
      setSubmittingPago(false)
    }
  }

  // Load the package catalog once so the editable "Paquete" select has options.
  useEffect(() => {
    const loadPaquetes = async () => {
      try {
        const res = await fetch("/api/packages")
        const data = await res.json()
        if (data.packages) {
          setPaquetes(data.packages.map((p: any) => ({ id: p.id, nombre: p.nombre })))
        }
      } catch (e) {
        console.error("[v0] Error loading paquetes:", e)
      }
    }
    loadPaquetes()
  }, [])

  // Updates the package on the master contract (and its installation rows)
  // WITHOUT recalculating the client's monthly price (valor_paquete stays as-is).
  const handleUpdatePaquete = async (nuevoPaquete: string) => {
    if (!contratoInfo || !nuevoPaquete || nuevoPaquete === contratoInfo.nombre_paquete) return

    setSavingPaquete(true)
    try {
      // Resolve the package id so contratos.paquete_id stays in sync with
      // contratos.nombre_paquete.
      const paqueteId = paquetes.find((p) => p.nombre === nuevoPaquete)?.id ?? null

      const res = await fetch("/api/historial-instalaciones/paquete", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contrato_id: contratoInfo.id,
          paquete: nuevoPaquete,
          paquete_id: paqueteId,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo actualizar el paquete")
      }

      // Reflect the new package immediately; leave valor_paquete untouched.
      setContratoInfo((prev) => (prev ? { ...prev, nombre_paquete: nuevoPaquete } : prev))

      setShowEditPaqueteDialog(false)
      setNewPaquete("")

      toast({
        title: "Paquete actualizado",
        description: "Paquete actualizado exitosamente en el historial y en el contrato maestro.",
      })
    } catch (e: any) {
      console.error("[v0] Error updating paquete:", e)
      toast({
        title: "Error",
        description: e.message || "Error al actualizar el paquete",
        variant: "destructive",
      })
    } finally {
      setSavingPaquete(false)
    }
  }

  const handleConfirmarReconfirmacion = async () => {
    setReconfirmacionDialog({ open: false, count: 0, duplicates: [] })
    await submitPago()
  }

  const handleConfirmarPago = async () => {
    if (!confirmarPagoDialog.pago) return
    if (!confirmarPassword) {
      alert("Debe ingresar la contraseña")
      return
    }

    setConfirmandoPago(true)
    try {
      const response = await fetch(
        `/api/plan-pagos/${confirmarPagoDialog.pago.id}/confirmar-pago`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: confirmarPassword }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Error al confirmar pago")
      }

      alert("Pago confirmado correctamente")
      setConfirmarPagoDialog({ open: false, pago: null })
      setConfirmarPassword("")

      // Refresh the table so the new "Confirmado" badge shows immediately.
      if (contratoInfo) {
        await loadPaymentHistory(String(contratoInfo.id))
      }
    } catch (error: any) {
      console.error("[v0] Error confirming payment:", error)
      alert(error.message || "No se pudo confirmar el pago")
    } finally {
      setConfirmandoPago(false)
    }
  }

  const handleSearchContrato = async () => {
    if (!searchContrato.trim()) {
      return
    }

    // Direct contract search isn't tied to a cliente, so hide any multi-
    // contract selector left over from a previous cliente search.
    setContratosCliente([])
    setClienteSeleccionadoNombre("")

    setLoading(true)
    try {
      // Get contract info
      const contratoResponse = await fetch(`/api/contracts/${searchContrato}`)
      if (!contratoResponse.ok) {
        throw new Error("Contrato no encontrado")
      }
      const contratoData = await contratoResponse.json()
      setContratoInfo(contratoData)

      // Get payment history
      const pagosResponse = await fetch(`/api/payment-history?contrato_id=${searchContrato}`)
      const pagosData = await pagosResponse.json()
      setPagos(pagosData)
      
      console.log("[v0] Loaded contract and payment history for:", searchContrato)
    } catch (error) {
      console.error("[v0] Error loading contract:", error)
      setContratoInfo(null)
      setPagos([])
      alert("No se encontró el contrato. Por favor verifique el número.")
    } finally {
      setLoading(false)
    }
  }

  const handleSearchCliente = async () => {
    if (!searchClienteName.trim()) {
      return
    }

    setLoading(true)
    try {
      // First, search for the client in clientes table
      const clienteResponse = await fetch(`/api/clientes/search?nombre=${encodeURIComponent(searchClienteName)}`)
      if (!clienteResponse.ok) {
        throw new Error("No se encontraron clientes")
      }
      
      const clientesData = await clienteResponse.json()
      // The endpoint returns { clientes: [...] }. The same name can exist as
      // several cliente records (different ids), so we must consider ALL of
      // them — not just the first — to surface every contract.
      const clientesList: Array<{ id: number; nombre_completo: string }> = Array.isArray(clientesData)
        ? clientesData
        : clientesData.clientes || []

      if (clientesList.length === 0) {
        alert("No se encontró el cliente")
        return
      }

      setClienteSeleccionadoNombre(clientesList[0].nombre_completo)
      console.log("[v0] Found", clientesList.length, "cliente record(s) for:", searchClienteName)

      // Fetch contracts for EVERY matching cliente id in parallel, then merge
      // and de-duplicate by contract id. This covers both cases: one cliente
      // with multiple contracts, and multiple cliente records sharing a name.
      const responses = await Promise.all(
        clientesList.map((c) =>
          fetch(`/api/contracts?cliente_id=${c.id}`)
            .then((r) => (r.ok ? r.json() : { contracts: [] }))
            .catch(() => ({ contracts: [] })),
        ),
      )

      const contractsMap = new Map<number, Contrato>()
      for (const data of responses) {
        const list: Contrato[] = Array.isArray(data) ? data : data.contracts || []
        for (const c of list) {
          contractsMap.set(c.id, c)
        }
      }
      const contractsList = Array.from(contractsMap.values()).sort((a, b) => b.id - a.id)

      if (contractsList.length === 0) {
        setContratosCliente([])
        alert("No se encontraron contratos para este cliente")
        return
      }

      setContratosCliente(contractsList)

      // Auto-load the first contract; the selector lets the user switch if
      // the cliente owns more than one.
      await cargarContrato(contractsList[0].id)

      console.log("[v0] Cliente", searchClienteName, "tiene", contractsList.length, "contrato(s)")
    } catch (error) {
      console.error("[v0] Error loading client:", error)
      setContratoInfo(null)
      setPagos([])
      alert("Error al buscar el cliente. Por favor intente de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPressCliente = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearchCliente()
    }
  }

  const openClienteModal = async () => {
    setIsClienteModalOpen(true)
    setClienteCurrentPage(1)
    setLoadingClientes(true)
    try {
      const response = await fetch("/api/clientes/all?page=1")
      if (response.ok) {
        const data = await response.json()
        setClientes(data.clientes || [])
        setFilteredClientes(data.clientes || [])
        setTotalClientePages(data.totalPages || 1)
        console.log("[v0] Loaded page 1 of", data.totalPages, "total", data.total, "clients for modal")
      }
    } catch (error) {
      console.error("[v0] Error loading clients:", error)
    } finally {
      setLoadingClientes(false)
    }
  }

  const loadClientePage = async (page: number) => {
    setLoadingClientes(true)
    try {
      if (clienteSearchFilter.trim() !== "") {
        // If filtering, use search endpoint with pagination
        const response = await fetch(`/api/clientes/search?nombre=${encodeURIComponent(clienteSearchFilter)}&page=${page}`)
        if (response.ok) {
          const data = await response.json()
          setFilteredClientes(data.clientes || [])
          setTotalClientePages(data.totalPages || 1)
          setClienteCurrentPage(page)
          console.log("[v0] Search results page", page, "- Found", data.clientes?.length || 0, "clientes")
        }
      } else {
        // Load page normally
        const response = await fetch(`/api/clientes/all?page=${page}`)
        if (response.ok) {
          const data = await response.json()
          setClientes(data.clientes || [])
          setFilteredClientes(data.clientes || [])
          setTotalClientePages(data.totalPages || 1)
          setClienteCurrentPage(page)
          console.log("[v0] Loaded page", page, "of", data.totalPages)
        } else {
          console.error("[v0] API Error:", response.status, response.statusText)
        }
      }
    } catch (error) {
      console.error("[v0] Error loading clients page:", error)
    } finally {
      setLoadingClientes(false)
    }
  }

  const closeClienteModal = () => {
    setIsClienteModalOpen(false)
    setClienteSearchFilter("")
    setClienteCurrentPage(1)
  }

  const handleClienteSearchFilter = async (searchValue: string) => {
    setClienteSearchFilter(searchValue)
    setClienteCurrentPage(1)
    setLoadingClientes(true)
    
    try {
      if (searchValue.trim() === "") {
        // If search is empty, load page 1 normally
        setFilteredClientes(clientes)
        setTotalClientePages(totalClientePages)
      } else {
        // Search across entire table using server-side search
        const response = await fetch(`/api/clientes/search?nombre=${encodeURIComponent(searchValue)}&page=1`)
        if (response.ok) {
          const data = await response.json()
          setFilteredClientes(data.clientes || [])
          setTotalClientePages(data.totalPages || 1)
          console.log("[v0] Search filter - Found", data.total, "clientes with name matching:", searchValue)
        }
      }
    } catch (error) {
      console.error("[v0] Error filtering clientes:", error)
    } finally {
      setLoadingClientes(false)
    }
  }

  // Load a single contract (info + payment history) and mark it as active.
  // Shared by both the contract-id search and the cliente selection flows.
  const cargarContrato = async (contratoId: number | string) => {
    setLoading(true)
    try {
      const contratoResponse = await fetch(`/api/contracts/${contratoId}`)
      if (!contratoResponse.ok) {
        throw new Error("Contrato no encontrado")
      }
      const contratoData = await contratoResponse.json()
      setContratoInfo(contratoData)
      setSearchContrato(String(contratoId))

      const pagosResponse = await fetch(`/api/payment-history?contrato_id=${contratoId}`)
      const pagosData = await pagosResponse.json()
      setPagos(pagosData)
      console.log("[v0] Loaded contract and payment history for contrato:", contratoId)
    } catch (error) {
      console.error("[v0] Error loading contract:", error)
      setContratoInfo(null)
      setPagos([])
      alert("Error al cargar el contrato.")
    } finally {
      setLoading(false)
    }
  }

  const handleClienteSelect = async (cliente: Cliente) => {
    console.log("[v0] Selected cliente:", cliente.nombre_completo, "ID:", cliente.id, "Contrato ID:", cliente.contrato_id)

    closeClienteModal()
    setClienteSeleccionadoNombre(cliente.nombre_completo)

    setLoading(true)
    try {
      // Gather every cliente record that shares this name (the same person can
      // exist as several cliente rows with different ids), then fetch the
      // contracts for all of them. This guarantees we don't miss a contract
      // that lives under a duplicate cliente record.
      const clienteIds = new Set<number>([cliente.id])
      if (cliente.nombre_completo) {
        try {
          const searchRes = await fetch(
            `/api/clientes/search?nombre=${encodeURIComponent(cliente.nombre_completo)}`,
          )
          if (searchRes.ok) {
            const searchData = await searchRes.json()
            const matches: Array<{ id: number; nombre_completo: string }> = Array.isArray(searchData)
              ? searchData
              : searchData.clientes || []
            for (const m of matches) {
              // Only merge exact-name matches to avoid pulling unrelated
              // clients returned by the ilike partial search.
              if (m.nombre_completo === cliente.nombre_completo) clienteIds.add(m.id)
            }
          }
        } catch (e) {
          console.error("[v0] Error buscando clientes homónimos:", e)
        }
      }

      const responses = await Promise.all(
        Array.from(clienteIds).map((id) =>
          fetch(`/api/contracts?cliente_id=${id}`)
            .then((r) => (r.ok ? r.json() : { contracts: [] }))
            .catch(() => ({ contracts: [] })),
        ),
      )

      const contractsMap = new Map<number, Contrato>()
      for (const data of responses) {
        const list: Contrato[] = Array.isArray(data) ? data : data.contracts || []
        for (const c of list) contractsMap.set(c.id, c)
      }
      const contractsList = Array.from(contractsMap.values()).sort((a, b) => b.id - a.id)

      if (contractsList.length === 0) {
        setContratosCliente([])
        setContratoInfo(null)
        setPagos([])
        setSearchContrato("")
        alert("No se encontraron contratos para este cliente")
        return
      }

      setContratosCliente(contractsList)

      // Load the exact contract the user clicked in the list (its row carries
      // a specific contrato_id). Fall back to the first one if that contract
      // isn't in the resolved list for some reason.
      const clickedId = contractsList.some((c) => c.id === cliente.contrato_id)
        ? (cliente.contrato_id as number)
        : contractsList[0].id
      await cargarContrato(clickedId)

      console.log(
        "[v0] Cliente",
        cliente.nombre_completo,
        "tiene",
        contractsList.length,
        "contrato(s) en",
        clienteIds.size,
        "registro(s) de cliente",
      )
    } catch (error) {
      console.error("[v0] Error loading client contracts:", error)
      setContratosCliente([])
      setContratoInfo(null)
      setPagos([])
      alert("Error al buscar contratos del cliente.")
    } finally {
      setLoading(false)
    }
  }

  // Show all clientes from current page (server-side pagination)
  const currentClientes = filteredClientes

  const loadPaymentHistory = async (contratoId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/payment-history?contrato_id=${contratoId}`)
      const data = await response.json()
      setPagos(data)
      console.log("[v0] Loaded payment history for contract", contratoId, ":", data.length, "payments")
    } catch (error) {
      console.error("[v0] Error loading payment history:", error)
    } finally {
      setLoading(false)
    }
  }

  // Open the per-cuota comentario dialog with the existing text pre-filled.
  const openComentarioDialog = (pago: any) => {
    setComentarioDialog({
      open: true,
      pagoId: pago.id,
      text: pago.comentario || "",
      saving: false,
    })
  }

  const saveComentario = async () => {
    if (!comentarioDialog.pagoId) return
    setComentarioDialog((d) => ({ ...d, saving: true }))
    try {
      const res = await fetch(`/api/plan-pagos/${comentarioDialog.pagoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comentario: comentarioDialog.text.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "No se pudo guardar el comentario")
      }
      // Optimistically update the row so the new text shows without a refetch.
      setPagos((prev) =>
        prev.map((p: any) =>
          p.id === comentarioDialog.pagoId
            ? { ...p, comentario: comentarioDialog.text.trim() }
            : p,
        ),
      )
      setComentarioDialog({ open: false, pagoId: null, text: "", saving: false })
    } catch (e: any) {
      alert(e.message || "Error guardando comentario")
      setComentarioDialog((d) => ({ ...d, saving: false }))
    }
  }

  const submitCambiarMonto = async () => {
    if (!contratoInfo) return
    const montoNum = Number(cambiarMontoDialog.monto)
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      alert("Ingrese un monto valido mayor a 0")
      return
    }
    if (!cambiarMontoDialog.password) {
      alert("Debe ingresar la contraseña")
      return
    }
    setCambiarMontoDialog((d) => ({ ...d, saving: true }))
    try {
      const res = await fetch(`/api/plan-pagos/cambiar-monto-mensual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contrato_id: contratoInfo.id,
          monto: montoNum,
          password: cambiarMontoDialog.password,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar")
      alert(`Se actualizaron ${data.count || 0} cuotas pendientes a L${montoNum.toFixed(2)}`)
      setCambiarMontoDialog({ open: false, monto: "", password: "", saving: false })
      // Refresh the table so the new amounts appear immediately.
      await loadPaymentHistory(String(contratoInfo.id))
    } catch (e: any) {
      alert(e.message || "Error actualizando monto mensual")
      setCambiarMontoDialog((d) => ({ ...d, saving: false }))
    }
  }

  const handleEditClienteName = async () => {
    if (!newClienteName.trim() || !contratoInfo) {
      return
    }

    setUpdatingName(true)
    try {
      const response = await fetch(`/api/clientes/${contratoInfo.cliente_id}/update-name`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nuevoNombre: newClienteName.trim(),
          contratoId: contratoInfo.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update the contract info with the new client name
        if (contratoInfo.cliente) {
          setContratoInfo({
            ...contratoInfo,
            cliente: {
              ...contratoInfo.cliente,
              nombre_completo: newClienteName.trim(),
            },
          })
        }

        alert("Nombre del cliente actualizado correctamente")
        setShowEditNameDialog(false)
        setNewClienteName("")
      } else {
        const error = await response.json()
        alert(error.error || "Error al actualizar el nombre")
      }
    } catch (error) {
      console.error("[v0] Error updating client name:", error)
      alert("Error al actualizar el nombre del cliente")
    } finally {
      setUpdatingName(false)
    }
  }

  const openEditNameDialog = () => {
    if (contratoInfo?.cliente?.nombre_completo) {
      setNewClienteName(contratoInfo.cliente.nombre_completo)
      setShowEditNameDialog(true)
    }
  }

  const closeEditNameDialog = () => {
    setShowEditNameDialog(false)
    setNewClienteName("")
  }

  const openEditPaqueteDialog = () => {
    setNewPaquete(contratoInfo?.nombre_paquete || "")
    setShowEditPaqueteDialog(true)
  }

  const closeEditPaqueteDialog = () => {
    setShowEditPaqueteDialog(false)
    setNewPaquete("")
  }

  // Inactivar cuotas functions
  const openInactivarDialog = () => {
    setSelectedCuotasInactivar(new Set())
    setShowInactivarDialog(true)
  }

  const closeInactivarDialog = () => {
    setShowInactivarDialog(false)
    setSelectedCuotasInactivar(new Set())
    setComentarioInactivar("")
    setPasswordInactivar("")
  }

  const closeActivarDialog = () => {
    setActivarDialog({ open: false, ids: [] })
    setComentarioActivar("")
    setPasswordActivar("")
  }

  const toggleCuotaSelection = (pagoId: number) => {
    const newSelection = new Set(selectedCuotasInactivar)
    if (newSelection.has(pagoId)) {
      newSelection.delete(pagoId)
    } else {
      newSelection.add(pagoId)
    }
    setSelectedCuotasInactivar(newSelection)
  }

  const cuotasParaInactivar = pagos.filter(p => !p.pagado && p.inactiva !== "true" && p.inactiva !== true)
  const cuotasInactivas = pagos.filter(p => p.inactiva === "true" || p.inactiva === true)

  const toggleSelectAllInactivar = () => {
    if (selectedCuotasInactivar.size === cuotasParaInactivar.length) {
      setSelectedCuotasInactivar(new Set())
    } else {
      setSelectedCuotasInactivar(new Set(cuotasParaInactivar.map(p => p.id)))
    }
  }

  const handleInactivarCuotas = async () => {
    if (selectedCuotasInactivar.size === 0) return

    if (!passwordInactivar) {
      alert("Debe ingresar la contraseña para inactivar cuotas")
      return
    }

    setProcesandoInactivar(true)
    try {
      const response = await fetch("/api/plan-pagos/inactivar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedCuotasInactivar),
          comentario: comentarioInactivar,
          password: passwordInactivar,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al inactivar cuotas")
      }

      const data = await response.json()
      alert(`${data.count} cuota(s) inactivada(s) correctamente`)

      closeInactivarDialog()
      
      // Reload payment history
      if (contratoInfo) {
        const pagosResponse = await fetch(`/api/payment-history?contrato_id=${contratoInfo.id}`)
        const pagosData = await pagosResponse.json()
        setPagos(pagosData)
      }
    } catch (error: any) {
      console.error("[v0] Error inactivando cuotas:", error)
      alert(error.message || "No se pudieron inactivar las cuotas")
    } finally {
      setProcesandoInactivar(false)
    }
  }

  // Opens the activation confirmation dialog. The actual API call is fired
  // by `confirmActivarCuotas` once the user provides the admin password.
  const handleActivarCuotas = (pagoIds: number[]) => {
    if (!pagoIds || pagoIds.length === 0) return
    setComentarioActivar("")
    setPasswordActivar("")
    setActivarDialog({ open: true, ids: pagoIds })
  }

  const confirmActivarCuotas = async () => {
    if (activarDialog.ids.length === 0) return

    if (!passwordActivar) {
      alert("Debe ingresar la contraseña para activar cuotas")
      return
    }

    setProcesandoInactivar(true)
    try {
      const response = await fetch("/api/plan-pagos/activar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: activarDialog.ids,
          comentario: comentarioActivar,
          password: passwordActivar,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al activar cuotas")
      }

      const data = await response.json()
      alert(`${data.count} cuota(s) activada(s) correctamente`)

      closeActivarDialog()

      // Reload payment history
      if (contratoInfo) {
        const pagosResponse = await fetch(`/api/payment-history?contrato_id=${contratoInfo.id}`)
        const pagosData = await pagosResponse.json()
        setPagos(pagosData)
      }
    } catch (error: any) {
      console.error("[v0] Error activando cuotas:", error)
      alert(error.message || "No se pudieron activar las cuotas")
    } finally {
      setProcesandoInactivar(false)
    }
  }

  // Generate a printable Comprobante de Pago in FLASHCOM format.
  // Opens a new window with a print-ready HTML document and auto-fires the
  // browser's print dialog so the user can save it as PDF or print it.
  // Works without any external PDF library.
  const generateComprobante = (pago: PlanPagos) => {
    if (!contratoInfo) return

    // Resolve the human-readable estado for the receipt header
    const isInactiva = pago.inactiva === "true" || pago.inactiva === true
    let estadoTexto = "Pendiente"
    let estadoColor = "#3b82f6" // blue
    if (isInactiva) {
      estadoTexto = "Inactiva"
      estadoColor = "#6b7280" // gray
    } else if (pago.pagado) {
      estadoTexto = "PAGADO"
      estadoColor = "#16a34a" // green
    } else {
      const today = new Date()
      const vencimiento = new Date(pago.fecha_vencimiento)
      const diffDays = Math.ceil(
        (today.getTime() - vencimiento.getTime()) / (1000 * 60 * 60 * 24),
      )
      if (diffDays > 29) {
        estadoTexto = `Mora critica (${diffDays} dias)`
        estadoColor = "#dc2626"
      } else if (diffDays > 14) {
        estadoTexto = `En mora (${diffDays} dias)`
        estadoColor = "#ea580c"
      } else if (diffDays > 0) {
        estadoTexto = `Atrasado (${diffDays} dias)`
        estadoColor = "#ca8a04"
      }
    }

    const formatDate = (val: string | null | undefined) => {
      if (!val) return "-"
      // Avoid timezone drift on YYYY-MM-DD strings
      const [y, m, d] = String(val).slice(0, 10).split("-")
      if (!y || !m || !d) return String(val)
      return `${d}/${m}/${y}`
    }

    // Format a date as "Mes YYYY" in Spanish (e.g. "Enero 2026").
    // Used for the "Mes Pagado" column on the comprobante so the customer
    // sees which month the cuota corresponds to instead of an exact day.
    const formatMonthYear = (val: string | null | undefined) => {
      if (!val) return "-"
      const [y, m] = String(val).slice(0, 10).split("-")
      if (!y || !m) return String(val)
      const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
      ]
      const idx = parseInt(m, 10) - 1
      if (idx < 0 || idx > 11) return String(val)
      return `${meses[idx]} ${y}`
    }

    const monto = Number(pago.monto_esperado || 0).toFixed(2)
    const fechaEmision = new Date()
    const emisionStr = `${String(fechaEmision.getDate()).padStart(2, "0")}/${String(
      fechaEmision.getMonth() + 1,
    ).padStart(2, "0")}/${fechaEmision.getFullYear()} ${String(
      fechaEmision.getHours(),
    ).padStart(2, "0")}:${String(fechaEmision.getMinutes()).padStart(2, "0")}`

    // Comprobante number is a deterministic concat of contrato + cuota
    const comprobanteNum = `FC-${String(contratoInfo.id).padStart(6, "0")}-${String(
      pago.numero_cuota,
    ).padStart(3, "0")}`

    const cliente = contratoInfo.cliente?.nombre_completo || "N/A"
    const paquete = contratoInfo.nombre_paquete || "N/A"
    const contador = contratoInfo.numero_contador || "N/A"
    const referencia = (pago as any).referencia || "-"
    const comentario = (pago as any).comentario || ""

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Comprobante ${comprobanteNum}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1f2937;
    background: #f9fafb;
    padding: 24px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt {
    max-width: 720px;
    margin: 0 auto;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  .header {
    background: linear-gradient(135deg, #f97316 0%, #2563eb 100%);
    color: white;
    padding: 24px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .brand .logo {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.5px;
  }
  .brand .tag {
    font-size: 11px;
    opacity: 0.9;
    margin-top: 2px;
  }
  .header .doc-meta {
    text-align: right;
    font-size: 11px;
  }
  .header .doc-meta .num {
    font-size: 14px;
    font-weight: 700;
    margin-top: 2px;
    letter-spacing: 0.5px;
  }
  .title-band {
    background: #fff7ed;
    border-bottom: 2px solid #fed7aa;
    padding: 14px 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .title-band h1 {
    font-size: 18px;
    font-weight: 700;
    color: #9a3412;
    letter-spacing: 0.5px;
  }
  .estado-badge {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 20px;
    color: white;
    font-size: 12px;
    font-weight: 700;
    background: ${estadoColor};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .section {
    padding: 18px 28px;
    border-bottom: 1px solid #f3f4f6;
  }
  .section h2 {
    font-size: 11px;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px 24px;
  }
  .field .label {
    font-size: 10px;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }
  .field .value {
    font-size: 13px;
    color: #1f2937;
    font-weight: 600;
  }
  .pay-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
  }
  .pay-table th, .pay-table td {
    text-align: left;
    padding: 10px 8px;
    font-size: 12px;
  }
  .pay-table th {
    background: #f9fafb;
    color: #6b7280;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #e5e7eb;
  }
  .pay-table td {
    border-bottom: 1px solid #f3f4f6;
  }
  .pay-table .num { text-align: right; font-weight: 700; }
  .total-row {
    background: linear-gradient(90deg, #fff7ed, #eff6ff);
    border-radius: 8px;
    padding: 16px 20px;
    margin-top: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .total-row .lbl {
    font-size: 12px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
  }
  .total-row .amount {
    font-size: 24px;
    font-weight: 800;
    color: ${pago.pagado ? "#16a34a" : "#f97316"};
  }
  .footer {
    padding: 16px 28px;
    background: #f9fafb;
    font-size: 10px;
    color: #9ca3af;
    text-align: center;
    line-height: 1.6;
  }
  .footer strong { color: #6b7280; }
  .stamp {
    display: inline-block;
    transform: rotate(-8deg);
    border: 3px solid ${estadoColor};
    color: ${estadoColor};
    padding: 4px 16px;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: 2px;
    border-radius: 6px;
    opacity: 0.85;
  }
  .stamp-wrap {
    text-align: center;
    padding: 18px 28px 4px;
  }
  .actions {
    text-align: center;
    padding: 16px;
  }
  .actions button {
    background: linear-gradient(135deg, #f97316, #2563eb);
    color: white;
    border: 0;
    padding: 10px 24px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin: 0 4px;
  }
  @media print {
    body { background: white; padding: 0; }
    .receipt { box-shadow: none; max-width: 100%; }
    .actions { display: none; }
  }
</style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="brand">
        <div class="logo">FLASHCOM</div>
        <div class="tag">Servicios de Internet y Cable</div>
      </div>
      <div class="doc-meta">
        <div>Comprobante No.</div>
        <div class="num">${comprobanteNum}</div>
        <div style="margin-top:6px;opacity:0.85;">Emitido: ${emisionStr}</div>
      </div>
    </div>

    <div class="title-band">
      <h1>Comprobante de Pago</h1>
      <span class="estado-badge">${estadoTexto}</span>
    </div>

    <div class="section">
      <h2>Informacion del Cliente</h2>
      <div class="grid">
        <div class="field">
          <div class="label">Cliente</div>
          <div class="value">${cliente}</div>
        </div>
        <div class="field">
          <div class="label">Contrato</div>
          <div class="value">#${contratoInfo.id}</div>
        </div>
        <div class="field">
          <div class="label">Paquete</div>
          <div class="value">${paquete}</div>
        </div>
        <div class="field">
          <div class="label">No. Contador</div>
          <div class="value">${contador}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Detalle de la Cuota</h2>
      <table class="pay-table">
        <thead>
          <tr>
            <th>Cuota</th>
            <th>Mes Pagado</th>
            <th>Estado</th>
            <th>Fecha de Pago</th>
            <th class="num">Monto</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>#${pago.numero_cuota}</strong></td>
            <td>${formatMonthYear(pago.fecha_vencimiento)}</td>
            <td><span style="color:${estadoColor};font-weight:700">${estadoTexto}</span></td>
            <td>${formatDate(pago.fecha_pago)}</td>
            <td class="num">L ${monto}</td>
          </tr>
        </tbody>
      </table>

      <div class="total-row">
        <span class="lbl">${pago.pagado ? "Total pagado" : "Monto a pagar"}</span>
        <span class="amount">L ${monto}</span>
      </div>

      ${
        referencia !== "-"
          ? `<div style="margin-top:12px;font-size:11px;color:#6b7280;"><strong>Referencia:</strong> ${referencia}</div>`
          : ""
      }
      ${
        comentario
          ? `<div style="margin-top:6px;font-size:11px;color:#6b7280;"><strong>Comentario:</strong> ${comentario}</div>`
          : ""
      }
    </div>

    ${
      pago.pagado
        ? `<div class="stamp-wrap"><span class="stamp">PAGADO</span></div>`
        : ""
    }

    <div class="footer">
      <div><strong>FLASHCOM</strong> - Comprobante generado electronicamente</div>
      <div>Este documento es valido como constancia de la transaccion registrada en el sistema.</div>
    </div>

    <div class="actions">
      <button id="btn-download" onclick="downloadAsPDF()">Descargar PDF</button>
      <button onclick="window.print()" style="background:#2563eb">Imprimir</button>
      <button onclick="window.close()" style="background:#6b7280">Cerrar</button>
    </div>
  </div>
  <!--
    html2pdf.js bundles html2canvas + jsPDF in a single browser script.
    Loaded from a CDN inside the popup so we don't have to add an npm dep.
  -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <script>
    var FILENAME = "Comprobante_${comprobanteNum}.pdf";

    function downloadAsPDF() {
      var btn = document.getElementById("btn-download");
      var receipt = document.querySelector(".receipt");
      // Hide the action bar inside the captured snapshot
      var actions = document.querySelector(".actions");
      var actionsDisplay = actions ? actions.style.display : "";
      if (actions) actions.style.display = "none";

      if (btn) { btn.disabled = true; btn.textContent = "Generando PDF..."; }

      var opt = {
        margin:       [10, 10, 10, 10],
        filename:     FILENAME,
        image:        { type: "jpeg", quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF:        { unit: "mm", format: "a4", orientation: "portrait" },
      };

      // Wait a tick to make sure layout is stable, then generate
      setTimeout(function() {
        if (typeof html2pdf === "undefined") {
          alert("No se pudo cargar el generador de PDF. Verifique su conexion.");
          if (actions) actions.style.display = actionsDisplay;
          if (btn) { btn.disabled = false; btn.textContent = "Descargar PDF"; }
          return;
        }
        html2pdf()
          .from(receipt)
          .set(opt)
          .save()
          .then(function() {
            if (actions) actions.style.display = actionsDisplay;
            if (btn) { btn.disabled = false; btn.textContent = "Descargar PDF"; }
          })
          .catch(function(err) {
            console.error("[v0] Error generating PDF:", err);
            alert("Error al generar el PDF. Intente nuevamente o use Imprimir.");
            if (actions) actions.style.display = actionsDisplay;
            if (btn) { btn.disabled = false; btn.textContent = "Descargar PDF"; }
          });
      }, 100);
    }
  </script>
</body>
</html>`

    const win = window.open("", "_blank", "width=820,height=900")
    if (!win) {
      alert("Por favor permita ventanas emergentes para generar el comprobante.")
      return
    }
    win.document.write(html)
    win.document.close()
    console.log("[v0] Comprobante generado:", comprobanteNum)
  }

  const getEstadoBadge = (pago: PlanPagos) => {
    // Check if cuota is inactive
    if (pago.inactiva === "true" || pago.inactiva === true) {
      return <Badge className="bg-gray-500 text-white text-[10px] px-2 py-0">Inactiva</Badge>
    }

    if (pago.pagado) {
      return <Badge className="bg-green-500 text-white text-[10px] px-2 py-0">Pagado</Badge>
    }

    const today = new Date()
    const vencimiento = new Date(pago.fecha_vencimiento)
    const diffTime = today.getTime() - vencimiento.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      return <Badge className="bg-blue-500 text-white text-[10px] px-2 py-0">Pendiente</Badge>
    } else if (diffDays <= 14) {
      return <Badge className="bg-yellow-500 text-white text-[10px] px-2 py-0">Atrasado {diffDays}d</Badge>
    } else if (diffDays <= 29) {
      return <Badge className="bg-orange-500 text-white text-[10px] px-2 py-0">Mora {diffDays}d</Badge>
    } else {
      return <Badge className="bg-red-600 text-white text-[10px] px-2 py-0">Mora crítica {diffDays}d</Badge>
    }
  }

  const totalCuotas = pagos.length
  const cuotasPagadas = pagos.filter((p) => p.pagado).length
  const cuotasPendientes = pagos.filter((p) => !p.pagado).length
  const montoTotal = pagos.reduce((sum, p) => sum + Number(p.monto_esperado), 0)
  const montoPagado = pagos.filter((p) => p.pagado).reduce((sum, p) => sum + Number(p.monto_esperado), 0)
  const montoPendiente = montoTotal - montoPagado

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-blue-50/30 p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-600 to-blue-600 bg-clip-text text-transparent">
              Historial de Pagos
            </h1>
            <p className="text-xs md:text-sm text-gray-600">Consulta el historial completo de pagos por contrato</p>
          </div>
        </div>

        {/* Contract Search */}
        <Card className="p-4 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Buscar Contrato</label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Ingrese el número de contrato..."
                value={searchContrato}
                onChange={(e) => setSearchContrato(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearchContrato()
                  }
                }}
                className="flex-1"
              />
              <Button onClick={handleSearchContrato} disabled={loading || !searchContrato.trim()}>
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        </Card>

        {/* Client Search - Modal Trigger */}
        <Card className="p-4 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">O Buscar por Nombre de Cliente</label>
            <div className="flex gap-2">
              <Button 
                onClick={openClienteModal} 
                variant="outline"
                className="flex-1 bg-transparent"
              >
                <Search className="w-4 h-4 mr-2" />
                Buscar Cliente
              </Button>
            </div>
          </div>
        </Card>

        {/* Contract selector — shown when the chosen cliente owns more than
            one contract so the user can switch between them. */}
        {contratosCliente.length > 1 && (
          <Card className="p-4 bg-amber-50 border border-amber-200/70 shadow-sm">
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-800">
                {clienteSeleccionadoNombre} tiene {contratosCliente.length} contratos. Seleccione uno:
              </p>
              <div className="flex flex-wrap gap-2">
                {contratosCliente.map((c) => {
                  const isActive = contratoInfo?.id === c.id
                  return (
                    <Button
                      key={c.id}
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                      onClick={() => cargarContrato(c.id)}
                      className={
                        isActive
                          ? "bg-orange-600 hover:bg-orange-700 text-white"
                          : "bg-white"
                      }
                    >
                      #{c.id}
                      {c.nombre_paquete ? ` · ${c.nombre_paquete}` : ""}
                    </Button>
                  )
                })}
              </div>
            </div>
          </Card>
        )}

        {contratoInfo ? (
          <>
            {/* Contract Info */}
            <Card className="p-4 bg-gradient-to-br from-orange-50 to-blue-50 border border-orange-200/50 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Información del Contrato</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                <div>
                  <span className="text-gray-600">Contrato ID:</span>
                  <p className="font-semibold text-orange-600">#{contratoInfo.id}</p>
                </div>
                <div>
                  <span className="text-gray-600">Cliente:</span>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{contratoInfo.cliente?.nombre_completo || "N/A"}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={openEditNameDialog}
                      className="h-6 px-2 text-gray-600 hover:text-orange-600 hover:bg-orange-100"
                      title="Editar nombre del cliente"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Paquete:</span>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{contratoInfo.nombre_paquete || "N/A"}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={openEditPaqueteDialog}
                      className="h-6 px-2 text-gray-600 hover:text-orange-600 hover:bg-orange-100"
                      title="Editar paquete"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Valor Mensual:</span>
                  <p className="font-semibold text-green-600">L{contratoInfo.valor_paquete.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Contador:</span>
                  <p className="font-semibold">{contratoInfo.numero_contador || "N/A"}</p>
                </div>
              </div>
            </Card>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Card className="p-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-600 mb-1">Total Cuotas</p>
                    <p className="text-xl font-bold text-gray-800">{totalCuotas}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
              </Card>

              <Card className="p-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-600 mb-1">Cuotas Pagadas</p>
                    <p className="text-xl font-bold text-green-600">{cuotasPagadas}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </Card>

              <Card className="p-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-600 mb-1">Cuotas Pendientes</p>
                    <p className="text-xl font-bold text-orange-600">{cuotasPendientes}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-orange-500" />
                </div>
              </Card>

              <Card className="p-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-600 mb-1">Monto Total</p>
                    <p className="text-lg font-bold text-gray-800">L{montoTotal.toFixed(2)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-gray-500" />
                </div>
              </Card>

              <Card className="p-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-600 mb-1">Monto Pagado</p>
                    <p className="text-lg font-bold text-green-600">L{montoPagado.toFixed(2)}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </Card>

              <Card className="p-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-600 mb-1">Monto Pendiente</p>
                    <p className="text-lg font-bold text-orange-600">L{montoPendiente.toFixed(2)}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-orange-500" />
                </div>
              </Card>
            </div>

            {/* Payment History Table */}
            <Card className="p-4 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Historial Completo de Pagos</h3>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() =>
                      setCambiarMontoDialog({ open: true, monto: "", password: "", saving: false })
                    }
                    variant="outline"
                    size="sm"
                    className="text-xs bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700"
                  >
                    <DollarSign className="w-3 h-3 mr-1" />
                    Cambiar Monto Mensual
                  </Button>
                  <Button
                    onClick={openInactivarDialog}
                    variant="outline"
                    size="sm"
                    className="text-xs bg-gray-100 hover:bg-gray-200"
                  >
                    <Power className="w-3 h-3 mr-1" />
                    Inactivar/Activar
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-500">Cargando...</div>
              ) : pagos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No hay pagos registrados</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gradient-to-r from-orange-50 to-blue-50">
                        <th className="text-left p-2 font-semibold text-gray-700 whitespace-nowrap">Cuota #</th>
                        <th className="text-left p-2 font-semibold text-gray-700 whitespace-nowrap">F. Vencimiento</th>
                        <th className="text-left p-2 font-semibold text-gray-700 whitespace-nowrap">Mes</th>
                        <th className="text-left p-2 font-semibold text-gray-700 whitespace-nowrap">Monto</th>
                        <th className="text-left p-2 font-semibold text-gray-700 whitespace-nowrap">Estado</th>
                        <th className="text-left p-2 font-semibold text-gray-700 whitespace-nowrap">F. Pago</th>
                        <th className="text-left p-2 font-semibold text-gray-700 whitespace-nowrap">Confirmado</th>
                        <th className="text-left p-2 font-semibold text-gray-700 whitespace-nowrap">Comprobante</th>
                        <th className="text-left p-2 font-semibold text-gray-700 whitespace-nowrap">Comentario</th>
                        <th className="text-center p-2 font-semibold text-gray-700 whitespace-nowrap">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagos.map((pago) => (
                        <tr key={pago.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <td className="p-2 whitespace-nowrap">
                            <span className="font-semibold text-orange-600">#{pago.numero_cuota}</span>
                          </td>
                          <td className="p-2 whitespace-nowrap text-gray-700">{pago.fecha_vencimiento}</td>
                          <td className="p-2 whitespace-nowrap text-gray-700">{getMesNombre(pago.fecha_vencimiento)}</td>
                          <td className="p-2 whitespace-nowrap">
                            <span className="font-semibold text-green-600">
                              L{Number(pago.monto_esperado).toFixed(2)}
                            </span>
                          </td>
                          <td className="p-2 whitespace-nowrap">{getEstadoBadge(pago)}</td>
                          <td className="p-2 whitespace-nowrap text-gray-700">
                            {pago.fecha_pago || <span className="text-gray-400">-</span>}
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            {pago.confirmado ? (
                              <Badge className="bg-green-500 text-white text-[10px] px-2 py-0">Sí</Badge>
                            ) : (
                              <Badge className="bg-gray-400 text-white text-[10px] px-2 py-0">No</Badge>
                            )}
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            {pago.comprobante ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setVerComprobanteDialog({
                                    open: true,
                                    url: pago.comprobante as string,
                                  })
                                }
                                className="h-6 text-[10px] px-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                                title="Ver comprobante de pago"
                              >
                                <ImageIcon className="w-3 h-3 mr-1" />
                                Ver
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="p-2 max-w-[200px]">
                            <div className="flex items-center gap-1">
                              {(pago as any).comentario ? (
                                <span
                                  className="text-gray-700 text-[11px] block truncate flex-1"
                                  title={(pago as any).comentario}
                                >
                                  {(pago as any).comentario}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-[10px] flex-1">-</span>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openComentarioDialog(pago)}
                                className="h-6 w-6 p-0 text-gray-500 hover:text-orange-600 hover:bg-orange-50"
                                title="Editar comentario"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="p-2 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1">
                              {!pago.pagado && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setRegistrarPagoDialog({ open: true, pago })
                                  }
                                  className="h-7 text-[10px] border-blue-300 text-blue-700 hover:bg-blue-50"
                                  title="Registrar pago"
                                >
                                  <Upload className="w-3 h-3 mr-1" />
                                  Pagar
                                </Button>
                              )}
                              {pago.pagado &&
                                (pago as any).confirmado !== "si" &&
                                (pago as any).confirmado !== true && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setConfirmarPagoDialog({ open: true, pago })
                                    }
                                    className="h-7 text-[10px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                    title="Confirmar pago"
                                  >
                                    <Lock className="w-3 h-3 mr-1" />
                                    Confirmar
                                  </Button>
                                )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateComprobante(pago)}
                                className="h-7 text-[10px] border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                                title="Generar comprobante en PDF"
                              >
                                <Receipt className="w-3 h-3 mr-1" />
                                Comprobante
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        ) : (
          <Card className="p-8 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm">
            <div className="text-center text-gray-500">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">Ingrese el número de contrato para ver su historial de pagos</p>
            </div>
          </Card>
        )}
      </div>

      {/* Cliente Selection Modal */}
      {isClienteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl bg-white shadow-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-blue-50">
              <h2 className="text-lg font-semibold text-gray-800">Seleccionar Cliente</h2>
              <button
                onClick={closeClienteModal}
                className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Search Filter */}
              <div>
                <Input
                  type="text"
                  placeholder="Filtrar por nombre de cliente..."
                  value={clienteSearchFilter}
                  onChange={(e) => handleClienteSearchFilter(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Clientes Table */}
              {loadingClientes ? (
                <div className="text-center py-8 text-gray-500">Cargando clientes...</div>
              ) : currentClientes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {clienteSearchFilter ? "No se encontraron clientes con ese nombre" : "No hay clientes disponibles"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left p-3 font-semibold text-gray-700">ID Contrato</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Nombre Completo</th>
                        <th className="text-center p-3 font-semibold text-gray-700">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentClientes.map((cliente) => (
                        <tr
                          key={`${cliente.id}-${cliente.contrato_id ?? "sin"}`}
                          className="border-b border-gray-100 hover:bg-orange-50/50 transition-colors"
                        >
                          <td className="p-3 text-gray-700 font-semibold text-orange-600">
                            {cliente.contrato_id ? `#${cliente.contrato_id}` : "Sin contrato"}
                          </td>
                          <td className="p-3 text-gray-700">{cliente.nombre_completo}</td>
                          <td className="p-3 text-center">
                            <Button
                              size="sm"
                              onClick={() => handleClienteSelect(cliente)}
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                            >
                              Seleccionar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
              {!clienteSearchFilter && totalClientePages > 1 && (
                <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200">
                  <Button
                    size="sm"
                    onClick={() => loadClientePage(Math.max(1, clienteCurrentPage - 1))}
                    disabled={clienteCurrentPage === 1 || loadingClientes}
                  >
                    Anterior
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Página</span>
                    <input
                      type="number"
                      min="1"
                      max={totalClientePages}
                      value={clienteCurrentPage}
                      onChange={(e) => {
                        const page = Math.min(totalClientePages, Math.max(1, Number.parseInt(e.target.value) || 1))
                        loadClientePage(page)
                      }}
                      className="w-12 px-2 py-1 text-center border border-gray-300 rounded text-sm"
                    />
                    <span className="text-sm text-gray-600">de {totalClientePages}</span>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => loadClientePage(Math.min(totalClientePages, clienteCurrentPage + 1))}
                    disabled={clienteCurrentPage === totalClientePages || loadingClientes}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Edit Client Name Dialog */}
      <Dialog open={showEditNameDialog} onOpenChange={closeEditNameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Nombre del Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Nuevo Nombre</label>
              <Input
                type="text"
                value={newClienteName}
                onChange={(e) => setNewClienteName(e.target.value)}
                placeholder="Ingrese el nuevo nombre del cliente"
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleEditClienteName()
                  }
                }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={closeEditNameDialog}
                disabled={updatingName}
              >
                Cancelar
              </Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600"
                onClick={handleEditClienteName}
                disabled={updatingName || !newClienteName.trim()}
              >
                {updatingName ? "Actualizando..." : "Actualizar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Paquete Dialog */}
      <Dialog open={showEditPaqueteDialog} onOpenChange={closeEditPaqueteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Paquete del Contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Nuevo Paquete</label>
              <Select value={newPaquete} onValueChange={setNewPaquete}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar paquete" />
                </SelectTrigger>
                <SelectContent>
                  {paquetes.map((p) => (
                    <SelectItem key={p.id} value={p.nombre}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-gray-500">
                El precio mensual del cliente no se modificará al cambiar el paquete.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeEditPaqueteDialog} disabled={savingPaquete}>
                Cancelar
              </Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600"
                onClick={() => handleUpdatePaquete(newPaquete)}
                disabled={savingPaquete || !newPaquete || newPaquete === contratoInfo?.nombre_paquete}
              >
                {savingPaquete ? "Actualizando..." : "Actualizar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inactivar/Activar Cuotas Dialog */}
      <Dialog open={showInactivarDialog} onOpenChange={closeInactivarDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Inactivar / Activar Cuotas</DialogTitle>
            <DialogDescription>
              Seleccione las cuotas que desea inactivar. Las cuotas inactivadas no se contaran como pendientes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Comentario */}
            {cuotasParaInactivar.length > 0 && (
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Comentario (opcional)
                </label>
                <Textarea
                  placeholder="Escriba un comentario para esta inactivacion (ej: cliente solicito congelar servicio)..."
                  value={comentarioInactivar}
                  onChange={(e) => setComentarioInactivar(e.target.value)}
                  className="text-sm min-h-[60px]"
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">
                  El comentario se guardara en cada cuota inactivada seleccionada.
                </p>
              </div>
            )}

            {/* Cuotas para Inactivar */}
            {cuotasParaInactivar.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">Cuotas Pendientes (pueden inactivarse)</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={toggleSelectAllInactivar}
                    className="text-xs"
                  >
                    {selectedCuotasInactivar.size === cuotasParaInactivar.length ? "Deseleccionar todo" : "Seleccionar todo"}
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left">Sel.</th>
                        <th className="p-2 text-left">Cuota</th>
                        <th className="p-2 text-left">F. Vencimiento</th>
                        <th className="p-2 text-left">Mes</th>
                        <th className="p-2 text-left">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuotasParaInactivar.map((pago) => (
                        <tr key={pago.id} className="border-t hover:bg-gray-50">
                          <td className="p-2">
                            <Checkbox
                              checked={selectedCuotasInactivar.has(pago.id)}
                              onCheckedChange={() => toggleCuotaSelection(pago.id)}
                            />
                          </td>
                          <td className="p-2 font-semibold text-orange-600">#{pago.numero_cuota}</td>
                          <td className="p-2">{pago.fecha_vencimiento}</td>
                          <td className="p-2 text-gray-700">{getMesNombre(pago.fecha_vencimiento)}</td>
                          <td className="p-2 text-green-600 font-semibold">L{Number(pago.monto_esperado).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedCuotasInactivar.size > 0 && (
                  <div className="mt-3 space-y-3">
                    {/* Admin password required to perform the inactivation */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <label className="text-sm font-semibold text-amber-900 mb-1.5 flex items-center gap-1.5">
                        <Power className="w-3.5 h-3.5" />
                        Contraseña requerida
                      </label>
                      <Input
                        type="password"
                        value={passwordInactivar}
                        onChange={(e) => setPasswordInactivar(e.target.value)}
                        placeholder="Ingrese la contraseña de administrador"
                        className="text-sm bg-white"
                        autoComplete="off"
                      />
                      <p className="text-xs text-amber-700 mt-1.5">
                        Misma contraseña usada al eliminar pagos o ventas.
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={handleInactivarCuotas}
                        disabled={procesandoInactivar || !passwordInactivar}
                        className="bg-gray-600 hover:bg-gray-700"
                      >
                        {procesandoInactivar ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <Power className="w-4 h-4 mr-2" />
                            Inactivar {selectedCuotasInactivar.size} cuota(s)
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {cuotasParaInactivar.length === 0 && cuotasInactivas.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay cuotas pendientes para inactivar
              </div>
            )}

            {/* Cuotas Inactivas (para reactivar) */}
            {cuotasInactivas.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Cuotas Inactivas (pueden reactivarse)</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left">Cuota</th>
                        <th className="p-2 text-left">F. Vencimiento</th>
                        <th className="p-2 text-left">Mes</th>
                        <th className="p-2 text-left">Monto</th>
                        <th className="p-2 text-center">Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuotasInactivas.map((pago) => (
                        <tr key={pago.id} className="border-t hover:bg-gray-50 bg-gray-100">
                          <td className="p-2 font-semibold text-gray-500">#{pago.numero_cuota}</td>
                          <td className="p-2 text-gray-500">{pago.fecha_vencimiento}</td>
                          <td className="p-2 text-gray-500">{getMesNombre(pago.fecha_vencimiento)}</td>
                          <td className="p-2 text-gray-500">L{Number(pago.monto_esperado).toFixed(2)}</td>
                          <td className="p-2 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleActivarCuotas([pago.id])}
                              disabled={procesandoInactivar}
                              className="text-xs bg-green-50 hover:bg-green-100 text-green-700"
                            >
                              Activar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeInactivarDialog}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activar Cuotas Dialog — replaces the previous window.prompt flow.
          Requires the same admin password used for deleting payments/sales. */}
      <Dialog
        open={activarDialog.open}
        onOpenChange={(open) => {
          if (!open && !procesandoInactivar) closeActivarDialog()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Power className="w-5 h-5 text-green-600" />
              Activar cuota{activarDialog.ids.length > 1 ? "s" : ""}
            </DialogTitle>
            <DialogDescription>
              Confirme la activacion de {activarDialog.ids.length} cuota
              {activarDialog.ids.length > 1 ? "s" : ""}. Una vez activadas
              volveran a contarse como pendientes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">
                Comentario (opcional)
              </label>
              <Textarea
                placeholder="Ej: cliente reactiva el servicio..."
                value={comentarioActivar}
                onChange={(e) => setComentarioActivar(e.target.value)}
                className="text-sm min-h-[60px]"
                rows={2}
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <label className="text-sm font-semibold text-amber-900 mb-1.5 flex items-center gap-1.5">
                <Power className="w-3.5 h-3.5" />
                Contraseña requerida
              </label>
              <Input
                type="password"
                value={passwordActivar}
                onChange={(e) => setPasswordActivar(e.target.value)}
                placeholder="Ingrese la contraseña de administrador"
                className="text-sm bg-white"
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && passwordActivar && !procesandoInactivar) {
                    confirmActivarCuotas()
                  }
                }}
              />
              <p className="text-xs text-amber-700 mt-1.5">
                Misma contraseña usada al eliminar pagos o ventas.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeActivarDialog}
              disabled={procesandoInactivar}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmActivarCuotas}
              disabled={procesandoInactivar || !passwordActivar}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {procesandoInactivar ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Activando...
                </>
              ) : (
                <>
                  <Power className="w-4 h-4 mr-2" />
                  Confirmar activacion
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit comentario per cuota */}
      <Dialog
        open={comentarioDialog.open}
        onOpenChange={(open) =>
          !comentarioDialog.saving &&
          setComentarioDialog((d) => ({ ...d, open }))
        }
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Comentario del pago</DialogTitle>
            <DialogDescription>
              Agregue o edite el comentario asociado a esta cuota.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={comentarioDialog.text}
            onChange={(e) =>
              setComentarioDialog((d) => ({ ...d, text: e.target.value }))
            }
            placeholder="Escriba un comentario..."
            rows={4}
            className="text-sm"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setComentarioDialog({ open: false, pagoId: null, text: "", saving: false })
              }
              disabled={comentarioDialog.saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={saveComentario}
              disabled={comentarioDialog.saving}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {comentarioDialog.saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk-change the monthly amount for all unpaid cuotas */}
      <Dialog
        open={cambiarMontoDialog.open}
        onOpenChange={(open) =>
          !cambiarMontoDialog.saving &&
          setCambiarMontoDialog((d) => ({ ...d, open }))
        }
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar monto mensual</DialogTitle>
            <DialogDescription>
              Este nuevo monto se aplicara a TODAS las cuotas pendientes (no pagadas) del contrato.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nuevo monto mensual (L)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={cambiarMontoDialog.monto}
                onChange={(e) =>
                  setCambiarMontoDialog((d) => ({ ...d, monto: e.target.value }))
                }
                placeholder="0.00"
                className="text-sm bg-white"
              />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-2.5">
              <label className="block text-xs font-semibold text-amber-800 mb-1">
                Contraseña requerida
              </label>
              <Input
                type="password"
                value={cambiarMontoDialog.password}
                onChange={(e) =>
                  setCambiarMontoDialog((d) => ({ ...d, password: e.target.value }))
                }
                placeholder="Ingrese la contraseña de administrador"
                className="text-sm bg-white"
                autoComplete="off"
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    cambiarMontoDialog.monto &&
                    cambiarMontoDialog.password &&
                    !cambiarMontoDialog.saving
                  ) {
                    submitCambiarMonto()
                  }
                }}
              />
              <p className="text-xs text-amber-700 mt-1.5">
                Misma contraseña usada al eliminar pagos o cambiar montos.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setCambiarMontoDialog({ open: false, monto: "", password: "", saving: false })
              }
              disabled={cambiarMontoDialog.saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitCambiarMonto}
              disabled={
                cambiarMontoDialog.saving ||
                !cambiarMontoDialog.monto ||
                !cambiarMontoDialog.password
              }
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {cambiarMontoDialog.saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Aplicar a cuotas pendientes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comprobante preview — opens an inline image viewer instead of a new
          tab. Same interaction as on the /payments page so the experience
          stays consistent across modules. */}
      <Dialog
        open={verComprobanteDialog.open}
        onOpenChange={(open) =>
          setVerComprobanteDialog({ open, url: open ? verComprobanteDialog.url : null })
        }
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Comprobante de Pago</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-[28rem] bg-gray-50 rounded-md overflow-hidden">
            {verComprobanteDialog.url && (
              <Image
                src={verComprobanteDialog.url}
                alt="Comprobante de pago"
                fill
                className="object-contain"
                unoptimized
              />
            )}
          </div>
          {verComprobanteDialog.url && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setVerComprobanteDialog({ open: false, url: null })}
              >
                Cerrar
              </Button>
              <a
                href={verComprobanteDialog.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Abrir en pestaña nueva
                </Button>
              </a>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Register payment dialog — clones the /payments flow: pick or shoot
          a comprobante image, optional referencia (auto-validated against
          duplicates), submit to the same /registrar-pago endpoint. */}
      <Dialog
        open={registrarPagoDialog.open}
        onOpenChange={(open) => {
          if (!open && !submittingPago) resetRegistrarPagoDialog()
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Registrar Pago</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Suba el comprobante de pago para el contrato{" "}
              {registrarPagoDialog.pago?.contrato_id}, cuota{" "}
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
                      setComprobanteFile(null)
                      setComprobantePreview(null)
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
                onChange={(e) => setReferencia(e.target.value)}
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
              onClick={resetRegistrarPagoDialog}
              disabled={submittingPago}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRegistrarPago}
              disabled={!comprobanteFile || submittingPago}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submittingPago ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Registrar Pago"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reconfirmation dialog: shows when the typed referencia matches one
          or more existing payments. The user can still proceed if they're
          intentionally re-registering (e.g. duplicated transfer slip). */}
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
                {reconfirmacionDialog.count} pago
                {reconfirmacionDialog.count > 1 ? "s" : ""}
              </span>{" "}
              del sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1">
              <div className="font-semibold mb-1">Coincidencias encontradas:</div>
              {reconfirmacionDialog.duplicates.slice(0, 5).map((dup, idx) => (
                <div key={idx}>
                  Contrato #{dup.contrato_id}, Cuota {dup.numero_cuota} &mdash; Pagado:{" "}
                  {dup.fecha_pago}
                </div>
              ))}
              {reconfirmacionDialog.duplicates.length > 5 && (
                <div className="italic">
                  ...y {reconfirmacionDialog.duplicates.length - 5} mas
                </div>
              )}
            </div>
            <p className="text-sm text-gray-700">
              Desea registrar este pago de todos modos como una{" "}
              <span className="font-semibold">reconfirmacion</span>?
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setReconfirmacionDialog({ open: false, count: 0, duplicates: [] })
              }
              disabled={submittingPago}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarReconfirmacion}
              disabled={submittingPago}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {submittingPago ? "Registrando..." : "Si, registrar como reconfirmacion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm payment dialog — same password-protected flow as /payments.
          Hits POST /api/plan-pagos/:id/confirmar-pago which validates the
          admin password and flips `confirmado` to "si" in the DB. */}
      <Dialog
        open={confirmarPagoDialog.open}
        onOpenChange={(open) => {
          if (!open && !confirmandoPago) {
            setConfirmarPagoDialog({ open: false, pago: null })
            setConfirmarPassword("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pago</DialogTitle>
            <DialogDescription>
              Ingrese la contraseña para confirmar el pago del contrato{" "}
              {confirmarPagoDialog.pago?.contrato_id}, cuota{" "}
              {confirmarPagoDialog.pago?.numero_cuota}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirmar-password-historial">Contraseña</Label>
              <Input
                id="confirmar-password-historial"
                type="password"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                placeholder="Ingrese contraseña"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && confirmarPassword && !confirmandoPago) {
                    handleConfirmarPago()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmarPagoDialog({ open: false, pago: null })
                setConfirmarPassword("")
              }}
              disabled={confirmandoPago}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarPago}
              disabled={!confirmarPassword || confirmandoPago}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {confirmandoPago ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirmando...
                </>
              ) : (
                "Confirmar Pago"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
