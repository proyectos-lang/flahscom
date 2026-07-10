"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Phone, MapPin, Calendar, DollarSign, FileText, AlertCircle } from "lucide-react"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

interface Client {
  id: string
  name: string
  phone: string
  address: string
  plan: string
  monthlyFee: number
  lastPaymentDate: string
  daysOverdue: number
  status: "green" | "yellow" | "red"
  balance: number
}

interface ClientPortfolioCardProps {
  client: Client
}

export function ClientPortfolioCard({ client }: ClientPortfolioCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  const getStatusInfo = () => {
    switch (client.status) {
      case "green":
        return {
          color: "bg-green-500",
          textColor: "text-green-700",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          label: "Al día",
        }
      case "yellow":
        return {
          color: "bg-yellow-500",
          textColor: "text-yellow-700",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          label: "Próximo a vencer",
        }
      case "red":
        return {
          color: "bg-red-500",
          textColor: "text-red-700",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          label: "En mora",
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <>
      <Card className={`border-l-4 ${statusInfo.borderColor}`}>
        <CardContent className="p-3 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 flex-wrap">
                <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full ${statusInfo.color} animate-pulse flex-shrink-0`} />
                <h3 className="text-sm md:text-lg font-semibold truncate">{client.name}</h3>
                <Badge
                  variant="outline"
                  className={`${statusInfo.bgColor} ${statusInfo.textColor} border-0 text-[10px] md:text-xs flex-shrink-0`}
                >
                  {statusInfo.label}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
                <div className="flex items-center gap-2 text-xs md:text-sm">
                  <Phone className="w-3 h-3 md:w-4 md:h-4 text-gray-500 flex-shrink-0" />
                  <span className="truncate">{client.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-xs md:text-sm">
                  <MapPin className="w-3 h-3 md:w-4 md:h-4 text-gray-500 flex-shrink-0" />
                  <span className="truncate">{client.address}</span>
                </div>
                <div className="flex items-center gap-2 text-xs md:text-sm">
                  <FileText className="w-3 h-3 md:w-4 md:h-4 text-gray-500 flex-shrink-0" />
                  <span className="truncate">{client.plan}</span>
                </div>
                <div className="flex items-center gap-2 text-xs md:text-sm">
                  <DollarSign className="w-3 h-3 md:w-4 md:h-4 text-gray-500 flex-shrink-0" />
                  <span className="truncate">L {client.monthlyFee.toFixed(2)}/mes</span>
                </div>
              </div>

              <div className="mt-3 md:mt-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                <div className="flex items-center gap-2 text-xs md:text-sm">
                  <Calendar className="w-3 h-3 md:w-4 md:h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-600">Último pago:</span>
                  <span className="font-medium">{new Date(client.lastPaymentDate).toLocaleDateString()}</span>
                </div>
                {client.daysOverdue > 0 && (
                  <div className={`flex items-center gap-2 text-xs md:text-sm ${statusInfo.textColor}`}>
                    <AlertCircle className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                    <span className="font-medium">{client.daysOverdue} días de atraso</span>
                  </div>
                )}
                {client.balance > 0 && (
                  <div className="flex items-center gap-2 text-xs md:text-sm">
                    <span className="text-gray-600">Saldo:</span>
                    <span className={`font-bold ${statusInfo.textColor}`}>L {client.balance.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(true)}
              className="w-full md:w-auto text-xs md:text-sm flex-shrink-0"
            >
              Ver detalles
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${statusInfo.color}`} />
              {client.name}
            </DialogTitle>
            <DialogDescription>Información detallada del cliente</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <h4 className="font-semibold mb-3">Información de contacto</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Teléfono</p>
                  <p className="font-medium">{client.phone}</p>
                </div>
                <div>
                  <p className="text-gray-500">Dirección</p>
                  <p className="font-medium">{client.address}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-3">Información del servicio</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Plan contratado</p>
                  <p className="font-medium">{client.plan}</p>
                </div>
                <div>
                  <p className="text-gray-500">Tarifa mensual</p>
                  <p className="font-medium">L {client.monthlyFee.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-3">Estado de pagos</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Último pago</p>
                  <p className="font-medium">{new Date(client.lastPaymentDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Días de atraso</p>
                  <p className={`font-bold ${statusInfo.textColor}`}>{client.daysOverdue} días</p>
                </div>
                <div>
                  <p className="text-gray-500">Saldo pendiente</p>
                  <p className={`font-bold ${client.balance > 0 ? statusInfo.textColor : "text-green-600"}`}>
                    L {client.balance.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Estado</p>
                  <Badge variant="outline" className={`${statusInfo.bgColor} ${statusInfo.textColor} border-0`}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div className={`p-4 rounded-lg ${statusInfo.bgColor}`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`w-5 h-5 ${statusInfo.textColor} mt-0.5`} />
                <div>
                  <p className={`font-semibold ${statusInfo.textColor} mb-1`}>
                    {client.status === "green" && "Cliente al día"}
                    {client.status === "yellow" && "Atención requerida"}
                    {client.status === "red" && "Acción inmediata requerida"}
                  </p>
                  <p className="text-sm text-gray-700">
                    {client.status === "green" && "Este cliente ha realizado sus pagos a tiempo."}
                    {client.status === "yellow" &&
                      "Este cliente tiene entre 7 y 14 días de atraso. Considera contactarlo pronto."}
                    {client.status === "red" &&
                      "Este cliente tiene más de 14 días de atraso. Se requiere acción inmediata."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
