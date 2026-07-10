"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Search } from "lucide-react"

interface RegisterPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RegisterPaymentDialog({ open, onOpenChange }: RegisterPaymentDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [searchClient, setSearchClient] = useState("")
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const { toast } = useToast()

  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "",
    receiptNumber: "",
    notes: "",
  })

  // Mock clients - replace with actual data from Supabase
  const mockClients = [
    { id: "1", name: "Juan Pérez", phone: "+504 9876-5432", balance: 1500 },
    { id: "2", name: "María González", phone: "+504 9876-5433", balance: 500 },
    { id: "3", name: "Carlos Martínez", phone: "+504 9876-5434", balance: 0 },
  ]

  const filteredClients = mockClients.filter(
    (client) => client.name.toLowerCase().includes(searchClient.toLowerCase()) || client.phone.includes(searchClient),
  )

  const handleSubmit = async () => {
    if (!selectedClient) {
      toast({
        title: "Error",
        description: "Por favor selecciona un cliente",
        variant: "destructive",
      })
      return
    }

    if (!paymentData.amount || !paymentData.paymentMethod) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    // TODO: Implement actual submission when Supabase is connected
    setTimeout(() => {
      toast({
        title: "Pago registrado",
        description: `Pago de L ${paymentData.amount} registrado exitosamente`,
      })
      setIsLoading(false)
      onOpenChange(false)
      // Reset form
      setSelectedClient(null)
      setSearchClient("")
      setPaymentData({
        amount: "",
        paymentDate: new Date().toISOString().split("T")[0],
        paymentMethod: "",
        receiptNumber: "",
        notes: "",
      })
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>Registra un nuevo pago de cliente</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!selectedClient ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="searchClient">Buscar cliente *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="searchClient"
                    value={searchClient}
                    onChange={(e) => setSearchClient(e.target.value)}
                    placeholder="Nombre o teléfono del cliente..."
                    className="pl-10"
                  />
                </div>
              </div>

              {searchClient && (
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {filteredClients.length > 0 ? (
                    filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className="w-full p-4 hover:bg-gray-50 text-left transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-gray-600">{client.phone}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Saldo pendiente</p>
                            <p className={`font-bold ${client.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                              L {client.balance.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">No se encontraron clientes</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-lg">{selectedClient.name}</p>
                    <p className="text-sm text-gray-600">{selectedClient.phone}</p>
                    <p className="text-sm mt-1">
                      Saldo pendiente:{" "}
                      <span className={`font-bold ${selectedClient.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                        L {selectedClient.balance.toFixed(2)}
                      </span>
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedClient(null)}>
                    Cambiar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto (L) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Fecha de pago *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentData.paymentDate}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Método de pago *</Label>
                  <Select
                    value={paymentData.paymentMethod}
                    onValueChange={(value) => setPaymentData({ ...paymentData, paymentMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="bank_transfer">Transferencia bancaria</SelectItem>
                      <SelectItem value="card">Tarjeta de crédito/débito</SelectItem>
                      <SelectItem value="mobile_payment">Pago móvil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiptNumber">Número de recibo</Label>
                  <Input
                    id="receiptNumber"
                    value={paymentData.receiptNumber}
                    onChange={(e) => setPaymentData({ ...paymentData, receiptNumber: e.target.value })}
                    placeholder="REC-001"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  placeholder="Información adicional sobre el pago..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isLoading}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  {isLoading ? "Guardando..." : "Registrar pago"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
