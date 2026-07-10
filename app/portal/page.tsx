"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Lock,
  Loader2,
  AlertCircle,
  Wrench,
  Receipt,
  CheckCircle2,
  ArrowLeft,
  LogOut,
  FileText,
  Calendar,
  Phone,
  Wallet,
  ChevronRight,
  MessageCircle,
  ClipboardList,
} from "lucide-react"

interface Contrato {
  id: number
  nombre_paquete: string | null
  valor_paquete: number
  numero_contador: string | null
  fecha_contratacion: string | null
}

interface Cliente {
  nombre_completo: string
  numero_identidad: string
}

interface PlanPago {
  id: number | string
  numero_cuota: number
  fecha_vencimiento: string
  monto_esperado: number
  pagado: boolean
  fecha_pago: string | null
  inactiva?: string | boolean
}

interface Falla {
  id: number
  tipo_falla: string
  descripcion_falla: string | null
  estatus_falla: string
  fecha_preferencia_cliente: string | null
  created_at: string
}

const TIPOS_FALLA = ["FO", "TV ADICIONAL", "EQUIPO DAÑADO", "REPARA FO", "REVISIÓN DE TV"]

// Contact numbers for reporting faults. `wa` is the WhatsApp-ready number
// (country code + digits only) used to build the wa.me deep link.
const CONTACTOS_WHATSAPP = [
  { display: "+504 3146-3178", wa: "50431463178" },
  { display: "+504 3202-5838", wa: "50432025838" },
  { display: "+504 3276-2656", wa: "50432762656" },
]

type Step = "login" | "select-contract" | "hub" | "falla" | "estado"

function getFallaEstadoBadge(estatus: string) {
  const s = (estatus || "").toLowerCase()
  switch (s) {
    case "reportada":
      return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Reportada</Badge>
    case "programada":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Programada</Badge>
    case "asignada":
      return <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">Asignada</Badge>
    case "en_ruta":
      return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">En ruta</Badge>
    case "en_proceso":
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">En proceso</Badge>
    case "resuelta":
    case "resuelto":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Resuelta</Badge>
    case "fallida":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Fallida</Badge>
    default:
      return <Badge variant="outline">{estatus || "Pendiente"}</Badge>
  }
}

function formatFecha(val: string | null | undefined): string {
  if (!val) return "-"
  const d = new Date(String(val).slice(0, 10) + "T00:00:00")
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("es-HN", { day: "2-digit", month: "short", year: "numeric" })
}

export default function PortalPage() {
  const [step, setStep] = useState<Step>("login")

  // Login
  const [usuario, setUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState("")

  // Session (client-side only)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [contrato, setContrato] = useState<Contrato | null>(null)

  // Falla form
  const [tipoFalla, setTipoFalla] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [telefono, setTelefono] = useState("")
  const [fechaPreferencia, setFechaPreferencia] = useState("")
  const [submittingFalla, setSubmittingFalla] = useState(false)
  const [fallaSuccess, setFallaSuccess] = useState(false)

  // Client's reported faults (with their current status)
  const [misFallas, setMisFallas] = useState<Falla[]>([])
  const [loadingFallas, setLoadingFallas] = useState(false)

  // Estado de cuenta
  const [pagos, setPagos] = useState<PlanPago[]>([])
  const [loadingEstado, setLoadingEstado] = useState(false)

  const handleLogin = async () => {
    setLoginError("")
    const u = usuario.trim()
    const p = password.trim()
    if (!u || !p) {
      setLoginError("Ingrese su cédula en ambos campos.")
      return
    }
    if (u !== p) {
      setLoginError("El usuario y la contraseña deben ser su número de cédula.")
      return
    }

    setLoggingIn(true)
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula: u }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setLoginError(data.error || "No se pudo iniciar sesión.")
        return
      }

      setCliente(data.cliente)
      const list: Contrato[] = data.contratos || []
      setContratos(list)

      if (list.length === 1) {
        setContrato(list[0])
        setStep("hub")
      } else if (list.length > 1) {
        setStep("select-contract")
      } else {
        // No contracts on file — still let them in to see the message.
        setContrato(null)
        setStep("hub")
      }
    } catch (error) {
      console.error("[v0] Portal login failed:", error)
      setLoginError("Ocurrió un error. Intente de nuevo.")
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = () => {
    setStep("login")
    setUsuario("")
    setPassword("")
    setCliente(null)
    setContratos([])
    setContrato(null)
    setPagos([])
    setTipoFalla("")
    setDescripcion("")
    setTelefono("")
    setFechaPreferencia("")
    setFallaSuccess(false)
    setLoginError("")
  }

  const selectContrato = (c: Contrato) => {
    setContrato(c)
    setPagos([])
    setStep("hub")
  }

  const loadFallas = async (contratoId: number) => {
    setLoadingFallas(true)
    try {
      const res = await fetch(`/api/fallas?contrato_id=${contratoId}`)
      const data = await res.json()
      setMisFallas(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("[v0] Portal fallas fetch failed:", error)
      setMisFallas([])
    } finally {
      setLoadingFallas(false)
    }
  }

  const openFalla = () => {
    setFallaSuccess(false)
    setStep("falla")
    if (contrato) loadFallas(contrato.id)
  }

  const handleSubmitFalla = async () => {
    if (!contrato || !cliente || !tipoFalla) return
    setSubmittingFalla(true)
    try {
      const res = await fetch("/api/fallas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contrato_id: contrato.id,
          // The reporter recorded on the order is the client themselves.
          reportado_por: cliente.nombre_completo,
          telefono_contacto_adicional: telefono,
          tipo_falla: tipoFalla,
          descripcion_falla: descripcion,
          fecha_preferencia_cliente: fechaPreferencia || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert("Error: " + (data.error || "No se pudo registrar la falla"))
        return
      }
      setFallaSuccess(true)
      setTipoFalla("")
      setDescripcion("")
      setTelefono("")
      setFechaPreferencia("")
      // Refresh the list so the newly reported fault shows with its status.
      loadFallas(contrato.id)
    } catch (error) {
      console.error("[v0] Portal falla submit failed:", error)
      alert("No se pudo registrar la falla. Intente de nuevo.")
    } finally {
      setSubmittingFalla(false)
    }
  }

  const openEstado = async () => {
    if (!contrato) return
    setStep("estado")
    setLoadingEstado(true)
    try {
      const res = await fetch(`/api/payment-history?contrato_id=${contrato.id}`)
      const data = await res.json()
      setPagos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("[v0] Portal estado fetch failed:", error)
      setPagos([])
    } finally {
      setLoadingEstado(false)
    }
  }

  const getEstadoBadge = (p: PlanPago) => {
    if (p.inactiva === "true" || p.inactiva === true) {
      return <Badge className="bg-gray-400 text-white text-[10px]">Inactiva</Badge>
    }
    if (p.pagado) {
      return <Badge className="bg-green-500 text-white text-[10px]">Pagado</Badge>
    }
    const today = new Date()
    const venc = new Date(p.fecha_vencimiento)
    const diffDays = Math.ceil((today.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return <Badge className="bg-blue-500 text-white text-[10px]">Por vencer</Badge>
    if (diffDays <= 14) return <Badge className="bg-yellow-500 text-white text-[10px]">Atrasado</Badge>
    if (diffDays <= 29) return <Badge className="bg-orange-500 text-white text-[10px]">En mora</Badge>
    return <Badge className="bg-red-600 text-white text-[10px]">Mora crítica</Badge>
  }

  const activos = pagos.filter((p) => !(p.inactiva === "true" || p.inactiva === true))
  const cuotasPagadas = activos.filter((p) => p.pagado).length
  const cuotasPendientes = activos.filter((p) => !p.pagado).length
  const montoPendiente = activos
    .filter((p) => !p.pagado)
    .reduce((s, p) => s + Number(p.monto_esperado || 0), 0)
  const proximaCuota = activos
    .filter((p) => !p.pagado)
    .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())[0]

  const primerNombre = cliente?.nombre_completo?.split(" ")[0] || "Cliente"

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-orange-100 bg-white/70 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9">
              <Image src="/flashcom-logo.png" alt="Flashcom Honduras" fill className="object-contain" priority />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-orange-600 text-sm">Flashcom Honduras</span>
              <span className="text-[10px] text-gray-500 -mt-0.5">Portal de clientes</span>
            </div>
          </div>
          {step !== "login" && (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-600 hover:text-orange-600">
              <LogOut className="w-4 h-4 mr-1.5" />
              Salir
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 md:py-10">
        {/* LOGIN */}
        {step === "login" && (
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 text-balance">Bienvenido a su portal</h1>
              <p className="text-sm text-gray-500 mt-2 text-pretty">
                Ingrese con su número de cédula para reportar fallas y consultar su estado de cuenta.
              </p>
            </div>

            <Card className="p-6 space-y-4 shadow-lg border-orange-100">
              <div className="flex items-center justify-center mb-2">
                <div className="p-3 bg-gradient-to-br from-orange-100 to-blue-100 rounded-2xl">
                  <Lock className="w-6 h-6 text-orange-600" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Usuario (su cédula)</label>
                <Input
                  inputMode="numeric"
                  placeholder="Ej: 0801199012345"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleLogin()}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Contraseña (su cédula)</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="Repita su cédula"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleLogin()}
                />
              </div>

              {loginError && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <Button
                onClick={handleLogin}
                disabled={loggingIn}
                className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-semibold"
              >
                {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ingresar"}
              </Button>

              <p className="text-[11px] text-center text-gray-400 leading-relaxed">
                Su información es confidencial. Este portal es solo de consulta e ingreso de reportes.
              </p>
            </Card>
          </div>
        )}

        {/* SELECT CONTRACT */}
        {step === "select-contract" && (
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Hola, {primerNombre}</h1>
              <p className="text-sm text-gray-500 mt-2 text-pretty">
                Tiene {contratos.length} contratos registrados. Seleccione el que desea gestionar.
              </p>
            </div>
            <div className="space-y-3">
              {contratos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectContrato(c)}
                  className="w-full text-left"
                >
                  <Card className="p-4 flex items-center justify-between hover:border-orange-300 hover:shadow-md transition-all border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-orange-100 to-blue-100 rounded-xl">
                        <FileText className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">Contrato #{c.id}</p>
                        <p className="text-xs text-gray-500">
                          {c.nombre_paquete || "Plan"} · L{Number(c.valor_paquete || 0).toFixed(2)}/mes
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Card>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* HUB */}
        {step === "hub" && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 text-balance">
                Hola, {primerNombre}. Nos alegra atenderle.
              </h1>
              <p className="text-sm text-gray-500 mt-2 text-pretty">
                Desde aquí puede reportar una falla en su servicio o revisar el estado de sus pagos.
              </p>
            </div>

            {contrato ? (
              <Card className="p-4 mb-5 bg-gradient-to-br from-orange-50 to-blue-50 border-orange-200/60">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <FileText className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Contrato #{contrato.id} · {contrato.nombre_paquete || "Plan"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Mensualidad: L{Number(contrato.valor_paquete || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {contratos.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white text-xs"
                      onClick={() => setStep("select-contract")}
                    >
                      Cambiar contrato
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="p-4 mb-5 bg-yellow-50 border-yellow-200">
                <p className="text-sm text-yellow-800">
                  No encontramos contratos activos asociados a su cédula. Si cree que es un error, comuníquese con
                  nosotros.
                </p>
              </Card>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={openFalla}
                disabled={!contrato}
                className="text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Card className="p-6 h-full hover:border-orange-300 hover:shadow-md transition-all border-gray-200">
                  <div className="p-3 bg-orange-100 rounded-2xl w-fit mb-4">
                    <Wrench className="w-6 h-6 text-orange-600" />
                  </div>
                  <h2 className="font-bold text-gray-800 mb-1">Reportar una falla</h2>
                  <p className="text-sm text-gray-500 text-pretty">
                    Cuéntenos qué problema tiene con su servicio y lo atenderemos.
                  </p>
                </Card>
              </button>

              <button
                onClick={openEstado}
                disabled={!contrato}
                className="text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Card className="p-6 h-full hover:border-blue-300 hover:shadow-md transition-all border-gray-200">
                  <div className="p-3 bg-blue-100 rounded-2xl w-fit mb-4">
                    <Receipt className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="font-bold text-gray-800 mb-1">Mi estado de cuenta</h2>
                  <p className="text-sm text-gray-500 text-pretty">
                    Consulte sus cuotas pagadas, pendientes y su próximo vencimiento.
                  </p>
                </Card>
              </button>
            </div>

            <WhatsAppContactos />
          </div>
        )}

        {/* FALLA */}
        {step === "falla" && contrato && (
          <div className="max-w-xl mx-auto">
            <Button variant="ghost" size="sm" onClick={() => setStep("hub")} className="mb-3 text-gray-600 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Volver
            </Button>

            {fallaSuccess ? (
              <Card className="p-8 text-center space-y-4 border-green-200">
                <div className="mx-auto p-3 bg-green-100 rounded-full w-fit">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Recibimos su reporte</h2>
                  <p className="text-sm text-gray-500 mt-2 text-pretty">
                    Gracias, {primerNombre}. Nuestro equipo revisará su falla y se pondrá en contacto con usted.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                  <Button variant="outline" onClick={() => setStep("hub")}>
                    Volver al inicio
                  </Button>
                  <Button
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={() => setFallaSuccess(false)}
                  >
                    Reportar otra falla
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-orange-600" />
                  <h2 className="text-lg font-bold text-gray-800">Reportar una falla</h2>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Tipo de falla *</label>
                  <Select value={tipoFalla} onValueChange={setTipoFalla}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione el tipo de falla" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_FALLA.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Describa el problema</label>
                  <Textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Ej: No tengo señal de internet desde ayer por la tarde..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Teléfono de contacto</label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <Input
                      type="tel"
                      inputMode="numeric"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="98765432"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Fecha en que prefiere ser atendido</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <Input
                      type="date"
                      value={fechaPreferencia}
                      onChange={(e) => setFechaPreferencia(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSubmitFalla}
                  disabled={submittingFalla || !tipoFalla}
                  className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                >
                  {submittingFalla ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar reporte"
                  )}
                </Button>
              </Card>
            )}

            {/* Mis reportes y su estado */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-800">Mis reportes y su estado</h3>
              </div>

              {loadingFallas ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                </div>
              ) : misFallas.length === 0 ? (
                <Card className="p-6 text-center text-sm text-gray-500">
                  Aún no tiene reportes registrados para este contrato.
                </Card>
              ) : (
                <div className="space-y-3">
                  {misFallas.map((f) => (
                    <Card key={f.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-800 text-sm">{f.tipo_falla}</p>
                            <span className="text-[11px] text-gray-400">Reporte #{f.id}</span>
                          </div>
                          {f.descripcion_falla && (
                            <p className="text-sm text-gray-500 mt-1 text-pretty">{f.descripcion_falla}</p>
                          )}
                          <p className="text-[11px] text-gray-400 mt-1.5">
                            Reportado el {formatFecha(f.created_at)}
                          </p>
                        </div>
                        <div className="shrink-0">{getFallaEstadoBadge(f.estatus_falla)}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <WhatsAppContactos className="mt-6" />
          </div>
        )}

        {/* ESTADO DE CUENTA */}
        {step === "estado" && contrato && (
          <div>
            <Button variant="ghost" size="sm" onClick={() => setStep("hub")} className="mb-3 text-gray-600 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Volver
            </Button>

            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-800">Mi estado de cuenta</h2>
            </div>

            {loadingEstado ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : pagos.length === 0 ? (
              <Card className="p-8 text-center text-gray-500">
                No hay información de pagos disponible para este contrato.
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="p-4">
                    <p className="text-[11px] text-gray-500 mb-1">Cuotas pagadas</p>
                    <p className="text-2xl font-bold text-green-600">{cuotasPagadas}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-[11px] text-gray-500 mb-1">Cuotas pendientes</p>
                    <p className="text-2xl font-bold text-orange-600">{cuotasPendientes}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-[11px] text-gray-500 mb-1">Saldo pendiente</p>
                    <p className="text-xl font-bold text-gray-800">L{montoPendiente.toFixed(2)}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-[11px] text-gray-500 mb-1">Próximo vencimiento</p>
                    <p className="text-sm font-bold text-gray-800">
                      {proximaCuota ? formatFecha(proximaCuota.fecha_vencimiento) : "Al día"}
                    </p>
                  </Card>
                </div>

                {proximaCuota && (
                  <Card className="p-4 bg-gradient-to-br from-orange-50 to-blue-50 border-orange-200/60 flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-orange-600 shrink-0" />
                    <p className="text-sm text-gray-700 text-pretty">
                      Su próxima cuota (#{proximaCuota.numero_cuota}) por{" "}
                      <span className="font-semibold">L{Number(proximaCuota.monto_esperado).toFixed(2)}</span> vence el{" "}
                      <span className="font-semibold">{formatFecha(proximaCuota.fecha_vencimiento)}</span>.
                    </p>
                  </Card>
                )}

                {/* Table */}
                <Card className="p-0 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800">Detalle de cuotas</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs">
                          <th className="text-left font-medium px-4 py-2.5">Cuota</th>
                          <th className="text-left font-medium px-4 py-2.5">Vencimiento</th>
                          <th className="text-right font-medium px-4 py-2.5">Monto</th>
                          <th className="text-left font-medium px-4 py-2.5">Estado</th>
                          <th className="text-left font-medium px-4 py-2.5">Fecha de pago</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pagos.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50/60">
                            <td className="px-4 py-2.5 font-medium text-gray-700">#{p.numero_cuota}</td>
                            <td className="px-4 py-2.5 text-gray-600">{formatFecha(p.fecha_vencimiento)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-700">
                              L{Number(p.monto_esperado || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-2.5">{getEstadoBadge(p)}</td>
                            <td className="px-4 py-2.5 text-gray-500">{p.pagado ? formatFecha(p.fecha_pago) : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <p className="text-[11px] text-center text-gray-400">
                  Esta información es solo de consulta. Para realizar pagos, comuníquese con Flashcom Honduras.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function WhatsAppContactos({ className = "" }: { className?: string }) {
  return (
    <Card
      className={`p-5 md:p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 ${className}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="p-2 bg-green-100 rounded-xl">
          <MessageCircle className="w-5 h-5 text-green-600" />
        </div>
        <h3 className="text-lg md:text-xl font-bold text-gray-800 text-balance">
          ¿Necesita ayuda? Repórtenos su falla por WhatsApp
        </h3>
      </div>
      <p className="text-sm text-gray-600 mb-4 text-pretty">
        Toque cualquiera de nuestros números para abrir un chat de WhatsApp al instante.
      </p>

      <div className="grid sm:grid-cols-3 gap-3">
        {CONTACTOS_WHATSAPP.map((c) => (
          <a
            key={c.wa}
            href={`https://wa.me/${c.wa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl px-4 py-3 transition-colors shadow-sm"
          >
            <MessageCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm md:text-base whitespace-nowrap">{c.display}</span>
          </a>
        ))}
      </div>
    </Card>
  )
}
