"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Loader2 } from "lucide-react"

interface EditContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractId: number | null
  onContractUpdated?: () => void
}

interface Package {
  id: number
  nombre: string
  precio_mensual: number
}

interface Vendor {
  id: number
  nombre: string
}

export function EditContractDialog({ open, onOpenChange, contractId, onContractUpdated }: EditContractDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const [packages, setPackages] = useState<Package[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedPackage, setSelectedPackage] = useState<string>("")
  const [selectedVendor, setSelectedVendor] = useState<string>("")

  const [clientData, setClientData] = useState({
    fullName: "",
    identityNumber: "",
    phone: "",
    email: "",
    address: "",
    latitude: "",
    longitude: "",
  })

  const [contractData, setContractData] = useState({
    numeroContador: "",
    notes: "",
    observacionesRechazo: "",
  })

  useEffect(() => {
    if (open && contractId) {
      loadAllData()
    }
  }, [open, contractId])

  const loadAllData = async () => {
    setIsLoading(true)
    try {
      // Load packages and vendors in parallel first
      const [packagesRes, vendorsRes] = await Promise.all([fetch("/api/packages"), fetch("/api/vendors")])

      let loadedPackages: Package[] = []
      let loadedVendors: Vendor[] = []

      if (packagesRes.ok) {
        const packagesData = await packagesRes.json()
        loadedPackages = Array.isArray(packagesData.packages) ? packagesData.packages : []
        setPackages(loadedPackages)
      }

      if (vendorsRes.ok) {
        const vendorsData = await vendorsRes.json()
        loadedVendors = Array.isArray(vendorsData.vendors) ? vendorsData.vendors : []
        setVendors(loadedVendors)
      }

      // Now load contract data
      const contractRes = await fetch(`/api/contracts/${contractId}`)
      if (contractRes.ok) {
        const data = await contractRes.json()

        // Set client data
        if (data.cliente) {
          setClientData({
            fullName: data.cliente.nombre_completo || "",
            identityNumber: data.cliente.numero_identidad || "",
            phone: data.cliente.telefono || "",
            email: data.cliente.email || "",
            address: data.cliente.direccion || "",
            latitude: data.cliente.latitud?.toString() || "",
            longitude: data.cliente.longitud?.toString() || "",
          })
        }

        // Set contract data
        setContractData({
          numeroContador: data.numero_contador || "",
          notes: data.notas || "",
          observacionesRechazo: data.observaciones_rechazo || "",
        })

        // Set package and vendor AFTER they are loaded
        if (data.paquete_id) {
          setSelectedPackage(data.paquete_id.toString())
        }
        if (data.vendedor_id) {
          setSelectedVendor(data.vendedor_id.toString())
        }
      }
    } catch (error) {
      console.error("[v0] Error loading data:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar los datos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Tu navegador no soporta geolocalización",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Obteniendo ubicación...",
      description: "Por favor, autoriza el acceso a tu ubicación",
    })

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setClientData({
          ...clientData,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        })
        toast({
          title: "Ubicación obtenida",
          description: `Precisión: ${position.coords.accuracy.toFixed(0)}m`,
        })
      },
      (error) => {
        toast({
          title: "Error de ubicación",
          description: "No se pudo obtener la ubicación",
          variant: "destructive",
        })
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  const handleSave = async () => {
    if (!contractId) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientData,
          vendorId: selectedVendor ? Number.parseInt(selectedVendor) : null,
          packageId: selectedPackage ? Number.parseInt(selectedPackage) : null,
          numeroContador: contractData.numeroContador,
          installationData: { 
            notes: contractData.notes,
            observacionesRechazo: contractData.observacionesRechazo,
          },
        }),
      })

      if (response.ok) {
        toast({
          title: "Contrato actualizado",
          description: "Los cambios se han guardado exitosamente",
        })
        onOpenChange(false)
        onContractUpdated?.()
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "No se pudo actualizar el contrato",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error saving contract:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base">Editar Contrato #{contractId}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            <span className="ml-2 text-sm">Cargando datos...</span>
          </div>
        ) : (
          <Tabs defaultValue="client" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="client" className="text-xs">
                Cliente
              </TabsTrigger>
              <TabsTrigger value="contract" className="text-xs">
                Contrato
              </TabsTrigger>
            </TabsList>

            <TabsContent value="client" className="space-y-3 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nombre Completo</Label>
                  <Input
                    value={clientData.fullName}
                    onChange={(e) => setClientData({ ...clientData, fullName: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Número de Identidad</Label>
                  <Input
                    value={clientData.identityNumber}
                    onChange={(e) => setClientData({ ...clientData, identityNumber: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Teléfono</Label>
                  <Input
                    value={clientData.phone}
                    onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    value={clientData.email}
                    onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Dirección</Label>
                <Textarea
                  value={clientData.address}
                  onChange={(e) => setClientData({ ...clientData, address: e.target.value })}
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Latitud</Label>
                  <Input
                    value={clientData.latitude}
                    onChange={(e) => setClientData({ ...clientData, latitude: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Longitud</Label>
                  <Input
                    value={clientData.longitude}
                    onChange={(e) => setClientData({ ...clientData, longitude: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGetLocation}
                className="w-full text-xs h-8 bg-transparent"
              >
                <MapPin className="w-3 h-3 mr-1" />
                Obtener Ubicación Actual
              </Button>
            </TabsContent>

            <TabsContent value="contract" className="space-y-3 mt-3">
              <div className="space-y-1">
                <Label className="text-xs">Vendedor</Label>
                {vendors.length === 0 ? (
                  <div className="h-8 flex items-center text-xs text-muted-foreground">Cargando vendedores...</div>
                ) : (
                  <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccionar vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id.toString()} className="text-xs">
                          {vendor.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tipo de Plan</Label>
                {packages.length === 0 ? (
                  <div className="h-8 flex items-center text-xs text-muted-foreground">Cargando paquetes...</div>
                ) : (
                  <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccionar paquete" />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id.toString()} className="text-xs">
                          {pkg.nombre} - L{pkg.precio_mensual}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Número de Contador</Label>
                <Input
                  value={contractData.numeroContador}
                  onChange={(e) => setContractData({ ...contractData, numeroContador: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Notas</Label>
                <Textarea
                  value={contractData.notes}
                  onChange={(e) => setContractData({ ...contractData, notes: e.target.value })}
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Observaciones de Rechazo</Label>
                <Textarea
                  value={contractData.observacionesRechazo}
                  onChange={(e) => setContractData({ ...contractData, observacionesRechazo: e.target.value })}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs h-8">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-xs h-8"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Cambios"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
