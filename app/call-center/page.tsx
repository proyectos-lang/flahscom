"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Phone, Search, AlertCircle, CheckCircle2, Loader2, Calendar, Wallet } from "lucide-react"

interface Cliente {
  id: number
  nombre_completo: string
}

interface Contrato {
  id: number
  nombre_paquete: string
  valor_paquete: number
}

interface FallaPendiente {
  id: number
  tipo_falla: string
  descripcion_falla: string
  estatus_falla: string
  created_at: string
  fecha_preferencia_cliente: string | null
}

const TIPOS_FALLA = ["FO", "TV ADICIONAL", "EQUIPO DAÑADO", "REPARA FO", "REVISIÓN DE TV"]

export default function CallCenterPage() {
  const [searchById, setSearchById] = useState("")
  const [searchByName, setSearchByName] = useState("")
  const [searchByCedula, setSearchByCedula] = useState("")
  const [searching, setSearching] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [estadoCartera, setEstadoCartera] = useState<string | null>(null)
  const [fallaPendiente, setFallaPendiente] = useState<FallaPendiente | null>(null)

  // Form fields
  const [reportadoPor, setReportadoPor] = useState("Call Center 1")
  const [telefonoAdicional, setTelefonoAdicional] = useState("")
  const [tipoFalla, setTipoFalla] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [fechaPreferencia, setFechaPreferencia] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState(false)

  const handleSearchById = async () => {
    if (!searchById.trim()) return

    setSearching(true)
    try {
      const clienteId = Number(searchById)
      if (isNaN(clienteId)) {
        alert("Por favor ingresa un ID válido")
        setSearching(false)
        return
      }

      const response = await fetch(`/api/clientes/${clienteId}`)
      const data = await response.json()
      
      if (data.error) {
        alert(data.error)
        setClientes([])
      } else {
        // Show the cliente directly
        setClientes([{ id: data.id, nombre_completo: data.nombre_completo }])
      }
    } catch (error) {
      console.error("Error buscando por ID:", error)
      alert("Error al buscar cliente")
    } finally {
      setSearching(false)
    }
  }

  const handleSearchByName = async () => {
    if (!searchByName.trim()) return

    setSearching(true)
    try {
      const response = await fetch(`/api/clientes/search?nombre=${encodeURIComponent(searchByName)}`)
      const data = await response.json()
      setClientes(data.clientes || [])
    } catch (error) {
      console.error("Error buscando por nombre:", error)
    } finally {
      setSearching(false)
    }
  }

  const handleSearchByCedula = async () => {
    if (!searchByCedula.trim()) return

    setSearching(true)
    try {
      const response = await fetch(`/api/clientes/search?identidad=${encodeURIComponent(searchByCedula.trim())}`)
      const data = await response.json()
      setClientes(data.clientes || [])
    } catch (error) {
      console.error("Error buscando por cédula:", error)
    } finally {
      setSearching(false)
    }
  }

  const handleSelectCliente = async (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setClientes([])
    setSearchById("")
    setSearchByName("")
    setSearchByCedula("")
    setEstadoCartera(null)
    setFallaPendiente(null)

    // Fetch contrato info
    try {
      const response = await fetch(`/api/clientes/${cliente.id}`)
      const data = await response.json()
      if (data.contratos && data.contratos.length > 0) {
        const contratoData = data.contratos[0]
        setContrato(contratoData)

        // Fetch estado cartera from portfolio view
        try {
          const portfolioRes = await fetch(`/api/portfolio?searchId=${contratoData.id}`)
          const portfolioData = await portfolioRes.json()
          if (portfolioData.success && portfolioData.data?.length > 0) {
            setEstadoCartera(portfolioData.data[0].estado)
          }
        } catch {
          // silently ignore cartera fetch errors
        }

        // Check for pending fallas
        try {
          const fallasRes = await fetch(`/api/fallas?contrato_id=${contratoData.id}`)
          const fallasData = await fallasRes.json()
          if (fallasData && Array.isArray(fallasData)) {
            const pendiente = fallasData.find((f: FallaPendiente) => 
              f.estatus_falla && 
              f.estatus_falla.toLowerCase() !== "resuelto" && 
              f.estatus_falla.toLowerCase() !== "resuelta"
            )
            if (pendiente) {
              setFallaPendiente(pendiente)
            }
          }
        } catch {
          // silently ignore fallas fetch errors
        }
      }
    } catch (error) {
      console.error("Error obteniendo contrato:", error)
    }
  }

  const handleSubmit = async () => {
    if (!selectedCliente || !contrato || !reportadoPor.trim() || !tipoFalla) {
      alert("Por favor completa todos los campos requeridos")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/fallas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contrato_id: contrato.id,
          reportado_por: reportadoPor,
          telefono_contacto_adicional: telefonoAdicional,
          tipo_falla: tipoFalla,
          descripcion_falla: descripcion,
          fecha_preferencia_cliente: fechaPreferencia || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(true)
        // Reset form
        setSelectedCliente(null)
        setContrato(null)
        setEstadoCartera(null)
        setReportadoPor("Call Center 1")
        setTelefonoAdicional("")
        setTipoFalla("")
        setDescripcion("")
        setFechaPreferencia("")

        setTimeout(() => setSuccessMessage(false), 3000)
      } else {
        alert("Error: " + data.error)
      }
    } catch (error) {
      console.error("Error creando orden:", error)
      alert("Error al crear la orden de falla")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-blue-50/30 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Call Center - Gestión de Fallas</h1>
          <p className="text-gray-600">Registro de nuevas órdenes de servicio</p>
        </div>

        {successMessage && (
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-medium">Orden de falla creada exitosamente</p>
            </div>
          </Card>
        )}

        {/* Buscador de Cliente */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Buscar Cliente</h2>
          </div>

          {/* Search by ID */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Buscar por ID de Cliente</label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Ej: 4220"
                value={searchById}
                onChange={(e) => setSearchById(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchById()}
                className="flex-1"
              />
              <Button 
                onClick={handleSearchById} 
                disabled={searching}
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Search by Name */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Buscar por Nombre</label>
            <div className="flex gap-2">
              <Input
                placeholder="Nombre del cliente..."
                value={searchByName}
                onChange={(e) => setSearchByName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchByName()}
                className="flex-1"
              />
              <Button
                onClick={handleSearchByName}
                disabled={searching}
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Search by Cédula */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Buscar por Cédula</label>
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                placeholder="Ej: 0801199012345"
                value={searchByCedula}
                onChange={(e) => setSearchByCedula(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchByCedula()}
                className="flex-1"
              />
              <Button
                onClick={handleSearchByCedula}
                disabled={searching}
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Search results */}
          {clientes.length > 0 && (
            <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
              {clientes.map((cliente) => (
                <button
                  key={cliente.id}
                  onClick={() => handleSelectCliente(cliente)}
                  className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-gray-900">{cliente.nombre_completo}</p>
                  <p className="text-sm text-gray-500">ID: {cliente.id}</p>
                </button>
              ))}
            </div>
          )}

          {/* Selected cliente info */}
          {selectedCliente && contrato && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900">{selectedCliente.nombre_completo}</p>
                    <p className="text-sm text-gray-600">Contrato #{contrato.id}</p>
                    <p className="text-sm text-gray-600">
                      Plan: {contrato.nombre_paquete} - L{contrato.valor_paquete}
                    </p>
                    {estadoCartera && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <Wallet className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-xs font-medium text-gray-600">Estado cartera:</span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            estadoCartera === "Al dia"
                              ? "bg-green-100 text-green-700"
                              : estadoCartera === "Vencido"
                              ? "bg-red-100 text-red-700"
                              : estadoCartera === "Por vencer"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {estadoCartera}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedCliente(null); setContrato(null); setEstadoCartera(null); setFallaPendiente(null) }}>
                    Cambiar
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Alerta de Falla Pendiente */}
          {fallaPendiente && (
            <Card className="p-4 bg-red-50 border-2 border-red-300">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="font-bold text-red-700">Este cliente ya tiene una falla reportada</p>
                  <div className="text-sm text-red-600 space-y-1">
                    <p><span className="font-semibold">ID Falla:</span> #{fallaPendiente.id}</p>
                    <p><span className="font-semibold">Tipo:</span> {fallaPendiente.tipo_falla}</p>
                    <p><span className="font-semibold">Estado:</span> {fallaPendiente.estatus_falla}</p>
                    {fallaPendiente.descripcion_falla && (
                      <p><span className="font-semibold">Descripcion:</span> {fallaPendiente.descripcion_falla}</p>
                    )}
                    <p><span className="font-semibold">Fecha reporte:</span> {new Date(fallaPendiente.created_at).toLocaleDateString("es-HN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    {fallaPendiente.fecha_preferencia_cliente && (
                      <p><span className="font-semibold">Fecha preferencia:</span> {fallaPendiente.fecha_preferencia_cliente}</p>
                    )}
                  </div>
                  <p className="text-xs text-red-500 mt-2 font-medium">
                    Puede continuar registrando una nueva falla si es necesario.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </Card>

        {/* Formulario de Falla */}
        {selectedCliente && contrato && (
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">Registro de Falla</h2>
            </div>

            {/* Agente */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Agente que Reporta *</label>
              <Input value={reportadoPor} onChange={(e) => setReportadoPor(e.target.value)} placeholder="Call Center 1" />
            </div>

            {/* Teléfono Adicional */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Teléfono de Contacto Adicional</label>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <Input
                  type="tel"
                  value={telefonoAdicional}
                  onChange={(e) => setTelefonoAdicional(e.target.value)}
                  placeholder="98765432"
                />
              </div>
            </div>

            {/* Tipo de Falla */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Tipo de Falla *</label>
              <Select value={tipoFalla} onValueChange={setTipoFalla}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo de falla" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_FALLA.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Comentarios / Descripción</label>
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe el problema reportado por el cliente..."
                rows={4}
              />
            </div>

            {/* Fecha Preferencia */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Fecha Solicitada por el Cliente</label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <Input type="date" value={fechaPreferencia} onChange={(e) => setFechaPreferencia(e.target.value)} />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !tipoFalla}
              className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creando orden...
                </>
              ) : (
                "Crear Orden de Falla"
              )}
            </Button>
          </Card>
        )}
      </div>
    </main>
  )
}
