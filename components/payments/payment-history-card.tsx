"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, DollarSign, FileText, User } from "lucide-react"

interface Payment {
  id: string
  clientName: string
  amount: number
  paymentDate: string
  paymentMethod: "cash" | "bank_transfer" | "card" | "mobile_payment"
  receiptNumber: string
  collectedBy: string
  notes: string | null
}

interface PaymentHistoryCardProps {
  payment: Payment
}

const paymentMethodLabels = {
  cash: "Efectivo",
  bank_transfer: "Transferencia",
  card: "Tarjeta",
  mobile_payment: "Pago móvil",
}

const paymentMethodColors = {
  cash: "bg-green-100 text-green-800",
  bank_transfer: "bg-blue-100 text-blue-800",
  card: "bg-purple-100 text-purple-800",
  mobile_payment: "bg-orange-100 text-orange-800",
}

export function PaymentHistoryCard({ payment }: PaymentHistoryCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold">{payment.clientName}</h3>
              <Badge variant="outline" className={paymentMethodColors[payment.paymentMethod]}>
                {paymentMethodLabels[payment.paymentMethod]}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-gray-600">Monto</p>
                  <p className="font-bold text-green-600">L {payment.amount.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-gray-600">Fecha</p>
                  <p className="font-medium">{new Date(payment.paymentDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-gray-600">Recibo</p>
                  <p className="font-medium">{payment.receiptNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-gray-600">Cobrado por</p>
                  <p className="font-medium">{payment.collectedBy}</p>
                </div>
              </div>
            </div>

            {payment.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Nota:</span> {payment.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
