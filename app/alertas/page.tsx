"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Bell, 
  RefreshCw, 
  CheckCircle, 
  Loader2, 
  Calendar, 
  User, 
  AlertTriangle,
  MapPin
} from "lucide-react"

interface AlertaReconexion {
  id: number
  contrato_id: number
  cliente: string
  fecha_vencimiento: string
  fecha_pago: string
  horapago: string | null
  monto_esperado: number
  numero_cuota: number
  dias_retraso: number
  colonia: string | null
}

// Format a TIME column value ("HH:mm:ss") to a friendly 12h string. We avoid
// constructing a Date because that introduces timezone math; the value already
// represents Honduras local time at the moment the payment was registered.
function formatHora(hora: string | null): string | null {
  if (!hora) return null
  const [hStr, mStr] = hora.split(":")
  const h = Number(hStr)
  const m = Number(mStr)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`
}

export default function CentroAlertasPage() {
  const [reconexiones, setReconexiones] = useState<AlertaReconexion[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState<number | null>(null)
  const { toast } = useToast()

  const loadAlertas = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/alertas")
      if (!res.ok) throw new Error("Error al cargar alertas")
      const data = await res.json()
      
      if (data.success) {
        setReconexiones(data.reconexiones || [])
      }
    } catch (error) {
      console.error("Error loading alertas:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las alertas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadAlertas()
  }, [loadAlertas])

  const handleProcesarReconexion = async (id: number) => {
    setProcesando(id)
    try {
      const res = await fetch("/api/alertas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "reconexion", id }),
      })

      if (!res.ok) throw new Error("Error al procesar")

      // Remove from local state
      setReconexiones((prev) => prev.filter((a) => a.id !== id))
      
      toast({
        title: "Reconexion Procesada",
        description: "El servicio ha sido marcado para reconexion",
      })
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudo procesar la alerta",
        variant: "destructive",
      })
    } finally {
      setProcesando(null)
    }
  }

  const totalAlertas = reconexiones.length

  return (
    <div className="p-2 md:p-6 space-y-3 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
            <Bell className="w-4 h-4 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-gray-900">Centro de Alertas</h1>
            <p className="text-xs md:text-sm text-gray-500">Notificaciones pendientes</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs md:text-lg px-2 md:px-4 py-1 md:py-2">
            <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-orange-500" />
            {totalAlertas} Pendientes
          </Badge>
          <Button onClick={loadAlertas} variant="outline" disabled={loading} size="sm" className="h-7 md:h-9 text-xs md:text-sm">
            <RefreshCw className={`w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </div>

      {/* Stats Card */}
      <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white">
        <CardContent className="p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-sm text-orange-600 font-medium">Reconexiones Pendientes</p>
              <p className="text-xl md:text-3xl font-bold text-orange-700">{reconexiones.length}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 md:w-6 md:h-6 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-10 md:py-20">
          <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-orange-500" />
          <span className="ml-2 text-sm md:text-base text-gray-600">Cargando alertas...</span>
        </div>
      ) : totalAlertas === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-8 md:py-16 text-center">
            <CheckCircle className="w-10 h-10 md:w-16 md:h-16 mx-auto text-green-500 mb-2 md:mb-4" />
            <h3 className="text-base md:text-xl font-semibold text-gray-700">Sin Alertas Pendientes</h3>
            <p className="text-xs md:text-base text-gray-500 mt-1 md:mt-2">Todas las reconexiones han sido procesadas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 md:space-y-6">
          {/* Reconexiones Section */}
          {reconexiones.length > 0 && (
            <div>
              <h2 className="text-sm md:text-lg font-semibold text-gray-800 mb-2 md:mb-4 flex items-center gap-1 md:gap-2">
                <RefreshCw className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
                Reconexiones Pendientes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                {reconexiones.map((alerta) => (
                  <Card 
                    key={alerta.id} 
                    className="border-2 border-orange-200 bg-gradient-to-br from-white to-orange-50 hover:shadow-lg transition-all"
                  >
                    <CardContent className="p-2 md:p-4 space-y-2 md:space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-[10px] md:text-xs px-1.5 md:px-2">
                          <RefreshCw className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                          Reconexion
                        </Badge>
                        <span className="text-[10px] md:text-xs text-gray-500">
                          #{alerta.contrato_id}
                        </span>
                      </div>

                      {/* Client Info */}
                      <div className="space-y-1 md:space-y-2">
                        <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                          <User className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                          <span className="font-medium text-gray-800 truncate">{alerta.cliente}</span>
                        </div>
                        {alerta.colonia && (
                          <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm">
                            <MapPin className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                            <span className="text-gray-600 truncate">{alerta.colonia}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm">
                          <Calendar className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                          <span className="text-gray-600">
                            Vencio: {new Date(alerta.fecha_vencimiento).toLocaleDateString("es-HN", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm">
                          <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
                          <span className="text-gray-600">
                            Pago: {new Date(alerta.fecha_pago).toLocaleDateString("es-HN", {
                              day: "2-digit",
                              month: "short",
                            })}
                            {formatHora(alerta.horapago) && (
                              <span className="text-gray-500">
                                {" "}
                                · {formatHora(alerta.horapago)}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Delay Badge */}
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] md:text-xs ${
                            alerta.dias_retraso > 60 
                              ? "bg-red-100 text-red-700 border-red-300" 
                              : "bg-orange-100 text-orange-700 border-orange-300"
                          }`}
                        >
                          {alerta.dias_retraso}d retraso
                        </Badge>
                        <span className="text-xs md:text-sm font-semibold text-gray-700">
                          L {Number(alerta.monto_esperado).toFixed(2)}
                        </span>
                      </div>

                      {/* Action Button */}
                      <Button
                        onClick={() => handleProcesarReconexion(alerta.id)}
                        disabled={procesando === alerta.id}
                        className="w-full bg-orange-600 hover:bg-orange-700 h-8 md:h-10 text-xs md:text-sm"
                      >
                        {procesando === alerta.id ? (
                          <>
                            <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                            Reconectar
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
