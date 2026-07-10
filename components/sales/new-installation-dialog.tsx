"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, MapPin, Camera, Trash2 } from "lucide-react"

interface NewInstallationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContractCreated?: () => void // Added callback for when contract is created
}

interface Package {
  id: string
  nombre: string
  precio_mensual: number
  velocidad: string
  descripcion: string
}

interface Vendor {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
}

export function NewInstallationDialog({ open, onOpenChange, onContractCreated }: NewInstallationDialogProps) {
  const [step, setStep] = useState("client")
  const [isLoading, setIsLoading] = useState(false)
  const [useLocation, setUseLocation] = useState(false)
  const { toast } = useToast()

  const [packages, setPackages] = useState<Package[]>([])
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedVendor, setSelectedVendor] = useState<string>("")

  const [clientData, setClientData] = useState({
    fullName: "",
    identityNumber: "",
    phone: "",
    email: "",
    colonia: "",
    address: "",
    numeroContador: "", // Added meter number field
    latitude: "",
    longitude: "",
  })

  const [installationData, setInstallationData] = useState({
    planType: "",
    monthlyFee: "",
    installationCost: "",
    equipmentDetails: "",
    notes: "",
  })

  const [documents, setDocuments] = useState({
    identityFront: null as File | null,
    identityBack: null as File | null,
    contract1: null as File | null, // Changed from contract to contract1
    contract2: null as File | null, // Added contract2
    housePhoto: null as File | null,
    initialPaymentReceipt: null as File | null, // Added initial payment receipt
  })

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Tu navegador no soporta geolocalización",
        variant: "destructive",
      })
      return
    }

    setUseLocation(true)

    toast({
      title: "Obteniendo ubicación...",
      description: "Por favor, autoriza el acceso a tu ubicación",
    })

    const options = {
      enableHighAccuracy: true, // Use GPS for better accuracy
      timeout: 15000, // 15 seconds timeout (iOS needs more time)
      maximumAge: 0, // Don't use cached position
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("[v0] Location obtained:", position.coords)
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
        console.error("[v0] Geolocation error:", error)
        setUseLocation(false)

        let errorMessage = "No se pudo obtener la ubicación."

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Permiso denegado. Ve a Configuración > Safari > Ubicación y permite el acceso."
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Ubicación no disponible. Verifica que tengas señal GPS activa."
            break
          case error.TIMEOUT:
            errorMessage = "Tiempo de espera agotado. Intenta nuevamente en un lugar con mejor señal."
            break
        }

        toast({
          title: "Error de ubicación",
          description: errorMessage,
          variant: "destructive",
        })
      },
      options,
    )
  }

  const compressImage = async (file: File, documentType?: keyof typeof documents): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement("canvas")
          let width = img.width
          let height = img.height

          // Use higher resolution for contract and payment documents
          const isHighQualityDoc =
            documentType === "contract1" || documentType === "contract2" || documentType === "initialPaymentReceipt"
          const MAX_WIDTH = isHighQualityDoc ? 1200 : 400
          const MAX_HEIGHT = isHighQualityDoc ? 1200 : 400

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext("2d")
          ctx?.drawImage(img, 0, 0, width, height)

          // Use higher quality for contract and payment documents
          const quality = isHighQualityDoc ? 0.75 : 0.15

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                })
                console.log(
                  `[v0] Compressed ${file.name} (${isHighQualityDoc ? "High Quality" : "Standard"}): ${(file.size / 1024).toFixed(0)}KB → ${(blob.size / 1024).toFixed(0)}KB`,
                )
                resolve(compressedFile)
              } else {
                reject(new Error("Failed to compress image"))
              }
            },
            "image/jpeg",
            quality,
          )
        }
        img.onerror = () => reject(new Error("Failed to load image"))
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
    })
  }

  const handleFileChange = async (type: keyof typeof documents, file: File | null) => {
    if (file && file.type.startsWith("image/")) {
      try {
        const compressedFile = await compressImage(file, type)
        setDocuments({ ...documents, [type]: compressedFile })
      } catch (error) {
        console.error("[v0] Error compressing image:", error)
        // If compression fails, use original file
        setDocuments({ ...documents, [type]: file })
      }
    } else {
      setDocuments({ ...documents, [type]: file })
    }
  }

  const handleSubmit = async () => {
    try {
      setIsLoading(true)

      if (step === "client") {
        setStep("installation")
        setIsLoading(false)
        return
      }

      // Validations
      if (!clientData.fullName || !clientData.identityNumber || !clientData.phone || !clientData.colonia || !clientData.address) {
        toast({
          title: "Error",
          description: "Por favor complete todos los campos requeridos del cliente",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      if (!selectedPackage || !selectedVendor) {
        toast({
          title: "Error",
          description: "Por favor seleccione un paquete y un vendedor",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      if (!documents.identityFront || !documents.identityBack) {
        toast({
          title: "Error",
          description: "Por favor adjunte la foto frontal y reverso de la identidad",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const formData = new FormData()

      formData.append("clientData", JSON.stringify(clientData))
      formData.append("installationData", JSON.stringify(installationData))
      formData.append("vendorId", selectedVendor)
      formData.append("packageId", selectedPackage?.id || "")
      formData.append("symbolicCost", installationData.installationCost)

      // Append files
      if (documents.identityFront) formData.append("identityFront", documents.identityFront)
      if (documents.identityBack) formData.append("identityBack", documents.identityBack)
      if (documents.contract1) formData.append("contract1", documents.contract1)
      if (documents.contract2) formData.append("contract2", documents.contract2)
      if (documents.housePhoto) formData.append("housePhoto", documents.housePhoto)
      if (documents.initialPaymentReceipt) formData.append("initialPaymentReceipt", documents.initialPaymentReceipt)

      const response = await fetch("/api/installations", {
        method: "POST",
        body: formData, // Send FormData instead of JSON
      })

      let result
      const contentType = response.headers.get("content-type")

      if (contentType && contentType.includes("application/json")) {
        result = await response.json()
      } else {
        // If response is not JSON, read as text
        const text = await response.text()
        console.error("[v0] Non-JSON response received:", text)
        throw new Error("El servidor devolvió una respuesta inválida. Por favor intente nuevamente.")
      }

      if (!response.ok) {
        throw new Error(result.error || "Error al registrar la instalación")
      }

      console.log("[v0] Installation created successfully:", result)

      toast({
        title: "Instalación registrada",
        description: "La instalación se ha registrado exitosamente y está pendiente de aprobación",
      })

      setIsLoading(false)
      onOpenChange(false)

      if (onContractCreated) {
        onContractCreated()
      }

      setStep("client")
      setClientData({
        fullName: "",
        identityNumber: "",
        phone: "",
        email: "",
        colonia: "",
        address: "",
        numeroContador: "",
        latitude: "",
        longitude: "",
      })
      setInstallationData({
        planType: "",
        monthlyFee: "",
        installationCost: "",
        equipmentDetails: "",
        notes: "",
      })
      setDocuments({
        identityFront: null,
        identityBack: null,
        contract1: null,
        contract2: null,
        housePhoto: null,
        initialPaymentReceipt: null,
      })
      setSelectedPackage(null)
      setSelectedVendor("")
    } catch (error) {
      console.error("[v0] Error in handleSubmit:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo registrar la instalación",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("[v0] Loading packages and vendors from API...")

        const [packagesResponse, vendorsResponse] = await Promise.all([fetch("/api/packages"), fetch("/api/vendors")])

        const packagesResult = await packagesResponse.json()
        const vendorsResult = await vendorsResponse.json()

        if (!packagesResponse.ok) {
          throw new Error(packagesResult.error || "Error al cargar paquetes")
        }

        if (!vendorsResponse.ok) {
          throw new Error(vendorsResult.error || "Error al cargar vendedores")
        }

        console.log("[v0] Packages loaded:", packagesResult.packages)
        console.log("[v0] Vendors loaded:", vendorsResult.vendors)

        setPackages(packagesResult.packages || [])
        setVendors(vendorsResult.vendors || [])
      } catch (error) {
        console.error("[v0] Error loading data:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos necesarios",
          variant: "destructive",
        })
      }
    }

    if (open) {
      loadData()
    }
  }, [open, toast])

  const calculateSymbolicCost = () => {
    const today = new Date()
    const day = today.getDate()

    if (day >= 16 && day <= 21) {
      return 200
    } else if (day >= 22 && day <= 26) {
      return 130
    } else {
      return 0
    }
  }

  useEffect(() => {
    if (open) {
      const symbolicCost = calculateSymbolicCost()
      setInstallationData((prev) => ({
        ...prev,
        installationCost: symbolicCost.toString(),
      }))
    }
  }, [open])

  const handlePackageChange = (packageId: string) => {
    const selected = packages.find((p) => p.id === packageId)
    if (selected) {
      setSelectedPackage(selected)
      setInstallationData({
        ...installationData,
        planType: selected.nombre,
        monthlyFee: selected.precio_mensual.toString(),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base sm:text-lg">Nueva Instalación</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Registra una nueva instalación de internet
          </DialogDescription>
        </DialogHeader>

        <Tabs value={step} onValueChange={setStep} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8 sm:h-10">
            <TabsTrigger value="client" className="text-xs sm:text-sm">
              Cliente
            </TabsTrigger>
            <TabsTrigger value="installation" className="text-xs sm:text-sm">
              Instalación
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs sm:text-sm">
              Documentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="client" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="fullName" className="text-xs sm:text-sm">
                  Nombre completo *
                </Label>
                <Input
                  id="fullName"
                  value={clientData.fullName}
                  onChange={(e) => setClientData({ ...clientData, fullName: e.target.value })}
                  placeholder="Juan Pérez"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="identityNumber" className="text-xs sm:text-sm">
                  Número de identidad *
                </Label>
                <Input
                  id="identityNumber"
                  value={clientData.identityNumber}
                  onChange={(e) => setClientData({ ...clientData, identityNumber: e.target.value })}
                  placeholder="0801-1990-12345"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="phone" className="text-xs sm:text-sm">
                  Teléfono *
                </Label>
                <Input
                  id="phone"
                  value={clientData.phone}
                  onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                  placeholder="+504 9876-5432"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="email" className="text-xs sm:text-sm">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={clientData.email}
                  onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                  placeholder="cliente@email.com"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="numeroContador" className="text-xs sm:text-sm">
                Número de contador
              </Label>
              <Input
                id="numeroContador"
                value={clientData.numeroContador}
                onChange={(e) => setClientData({ ...clientData, numeroContador: e.target.value })}
                placeholder="12345678"
                className="h-8 sm:h-10 text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="colonia" className="text-xs sm:text-sm">
                Colonia *
              </Label>
              <Input
                id="colonia"
                value={clientData.colonia}
                onChange={(e) => setClientData({ ...clientData, colonia: e.target.value })}
                placeholder="Colonia o barrio"
                className="h-8 sm:h-10 text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="address" className="text-xs sm:text-sm">
                Dirección completa *
              </Label>
              <Textarea
                id="address"
                value={clientData.address}
                onChange={(e) => setClientData({ ...clientData, address: e.target.value })}
                placeholder="Calle, número de casa, referencias"
                rows={2}
                className="text-xs sm:text-sm resize-none"
              />
            </div>

            <div className="space-y-1 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Ubicación GPS</Label>
              <Button
                type="button"
                variant="outline"
                onClick={handleGetLocation}
                className="w-full bg-transparent h-8 sm:h-10 text-xs sm:text-sm"
              >
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                {useLocation ? "Ubicación capturada" : "Capturar ubicación actual"}
              </Button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-2">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="latitude" className="text-xs sm:text-sm">
                    Latitud
                  </Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="0.000001"
                    value={clientData.latitude}
                    onChange={(e) => setClientData({ ...clientData, latitude: e.target.value })}
                    placeholder="14.072706"
                    className="h-8 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="longitude" className="text-xs sm:text-sm">
                    Longitud
                  </Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="0.000001"
                    value={clientData.longitude}
                    onChange={(e) => setClientData({ ...clientData, longitude: e.target.value })}
                    placeholder="-87.192736"
                    className="h-8 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep("installation")}
                className="bg-orange-500 hover:bg-orange-600 h-8 sm:h-10 text-xs sm:text-sm px-3 sm:px-4"
              >
                Siguiente
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="installation" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="vendor" className="text-xs sm:text-sm">
                Vendedor *
              </Label>
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder="Selecciona un vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.length === 0 ? (
                    <SelectItem value="loading" disabled>
                      Cargando vendedores...
                    </SelectItem>
                  ) : (
                    vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.nombre}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="planType" className="text-xs sm:text-sm">
                  Tipo de plan *
                </Label>
                <Select value={selectedPackage?.id || ""} onValueChange={handlePackageChange}>
                  <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Selecciona un plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.length === 0 ? (
                      <SelectItem value="loading" disabled>
                        Cargando paquetes...
                      </SelectItem>
                    ) : (
                      packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.nombre} - L{pkg.precio_mensual.toFixed(2)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="monthlyFee" className="text-xs sm:text-sm">
                  Tarifa mensual (L) *
                </Label>
                <Input
                  id="monthlyFee"
                  type="number"
                  value={installationData.monthlyFee}
                  onChange={(e) => setInstallationData({ ...installationData, monthlyFee: e.target.value })}
                  placeholder="500.00"
                  disabled
                  className="bg-gray-50 h-8 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="installationCost" className="text-xs sm:text-sm">
                Costo simbólico (L) *
              </Label>
              <Input
                id="installationCost"
                type="number"
                value={installationData.installationCost}
                onChange={(e) => setInstallationData({ ...installationData, installationCost: e.target.value })}
                placeholder="0.00"
                disabled
                className="bg-gray-50 h-8 sm:h-10 text-xs sm:text-sm"
              />
              <p className="text-[10px] sm:text-xs text-gray-500">
                {Number.parseInt(installationData.installationCost) === 0
                  ? "Sin costo simbólico en esta fecha"
                  : `Costo basado en la fecha actual (día ${new Date().getDate()})`}
              </p>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="equipmentDetails" className="text-xs sm:text-sm">
                Detalles del equipo *
              </Label>
              <Textarea
                id="equipmentDetails"
                value={installationData.equipmentDetails}
                onChange={(e) => setInstallationData({ ...installationData, equipmentDetails: e.target.value })}
                placeholder="Router modelo X, módem Y, cable 50m, etc."
                rows={2}
                className="text-xs sm:text-sm resize-none"
              />
            </div>

            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="notes" className="text-xs sm:text-sm">
                Notas adicionales
              </Label>
              <Textarea
                id="notes"
                value={installationData.notes}
                onChange={(e) => setInstallationData({ ...installationData, notes: e.target.value })}
                placeholder="Cualquier información relevante sobre la instalación"
                rows={2}
                className="text-xs sm:text-sm resize-none"
              />
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep("client")}
                className="h-8 sm:h-10 text-xs sm:text-sm px-3 sm:px-4"
              >
                Anterior
              </Button>
              <Button
                onClick={() => setStep("documents")}
                className="bg-orange-500 hover:bg-orange-600 h-8 sm:h-10 text-xs sm:text-sm px-3 sm:px-4"
              >
                Siguiente
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            <p className="text-xs sm:text-sm text-gray-600">
              Sube los documentos requeridos para completar la instalación
            </p>

            <div className="space-y-3 sm:space-y-4">
              <DocumentUpload
                label="Foto de identidad (frente) *"
                file={documents.identityFront}
                onChange={(file) => handleFileChange("identityFront", file)}
              />
              <DocumentUpload
                label="Foto de identidad (reverso) *"
                file={documents.identityBack}
                onChange={(file) => handleFileChange("identityBack", file)}
              />
              <DocumentUpload
                label="Contrato firmado 1 *"
                file={documents.contract1}
                onChange={(file) => handleFileChange("contract1", file)}
              />
              <DocumentUpload
                label="Contrato firmado 2 *"
                file={documents.contract2}
                onChange={(file) => handleFileChange("contract2", file)}
              />
              <DocumentUpload
                label="Foto de la fachada *"
                file={documents.housePhoto}
                onChange={(file) => handleFileChange("housePhoto", file)}
              />
              <DocumentUpload
                label="Recibo de pago inicial"
                file={documents.initialPaymentReceipt}
                onChange={(file) => handleFileChange("initialPaymentReceipt", file)}
              />
            </div>

            <div className="flex justify-between pt-2 sm:pt-4">
              <Button
                variant="outline"
                onClick={() => setStep("installation")}
                className="h-8 sm:h-10 text-xs sm:text-sm px-3 sm:px-4"
              >
                Anterior
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-orange-500 hover:bg-orange-600 h-8 sm:h-10 text-xs sm:text-sm px-3 sm:px-4"
              >
                {isLoading ? "Guardando..." : "Registrar instalación"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

interface DocumentUploadProps {
  label: string
  file: File | null
  onChange: (file: File | null) => void
}

function DocumentUpload({ label, file, onChange }: DocumentUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCapture = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    onChange(selectedFile)

    if (selectedFile) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
  }

  return (
    <div className="space-y-1 sm:space-y-2">
      <Label className="text-xs sm:text-sm">{label}</Label>
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            onClick={handleCapture}
            className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white h-8 sm:h-10 text-xs sm:text-sm"
          >
            <Camera className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            {file ? "Cambiar foto" : "Tomar foto"}
          </Button>

          {file && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onChange(null)
                setPreview(null)
              }}
              className="text-red-600 hover:text-red-700 h-8 sm:h-10 w-8 sm:w-10 p-0"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          )}
        </div>

        {preview && (
          <div className="relative w-full h-32 sm:h-48 border rounded-lg overflow-hidden bg-gray-100">
            <img src={preview || "/placeholder.svg"} alt="Preview" className="w-full h-full object-contain" />
          </div>
        )}

        {file && (
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-green-600">
            <Upload className="w-3 h-3" />
            <span className="truncate">{file.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}
