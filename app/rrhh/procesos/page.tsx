"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { 
  AlertTriangle, 
  Search, 
  Plus, 
  Calendar,
  FileWarning,
  CheckCircle,
  Loader2,
  User,
  Clock,
  Paperclip,
  ExternalLink,
  Upload,
  X
} from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Empleado {
  id: number
  identificacion: string
  nombre_completo: string
  empresa: string
  activo: boolean
}

interface ProcesoDisciplinario {
  id: number
  empleado_id: number
  causal: string
  resultado: string | null
  fecha_sancion: string
  created_at: string
  url_documento: string | null
}

export default function ProcesosDisciplinariosPage() {
  const { toast } = useToast()
  
  // Empleados state
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loadingEmpleados, setLoadingEmpleados] = useState(true)
  
  // Selected employee
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null)
  const [openCombobox, setOpenCombobox] = useState(false)
  
  // Procesos for selected employee
  const [procesos, setProcesos] = useState<ProcesoDisciplinario[]>([])
  const [loadingProcesos, setLoadingProcesos] = useState(false)
  
  // New proceso form
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    causal: "",
    resultado: "",
    fecha_sancion: new Date().toISOString().split("T")[0]
  })
  const [archivoAdjunto, setArchivoAdjunto] = useState<File | null>(null)

  // Load empleados
  useEffect(() => {
    const loadEmpleados = async () => {
      try {
        const res = await fetch("/api/rrhh/empleados")
        const data = await res.json()
        if (data.success) {
          // Filter only active employees
          setEmpleados(data.data.filter((e: Empleado) => e.activo))
        }
      } catch (error) {
        console.error("Error loading empleados:", error)
      } finally {
        setLoadingEmpleados(false)
      }
    }
    loadEmpleados()
  }, [])

  // Load procesos when employee is selected
  const loadProcesos = useCallback(async () => {
    if (!selectedEmpleado) return
    
    setLoadingProcesos(true)
    try {
      const res = await fetch(`/api/rrhh/procesos?empleado_id=${selectedEmpleado.id}`)
      const data = await res.json()
      if (data.success) {
        setProcesos(data.data)
      }
    } catch (error) {
      console.error("Error loading procesos:", error)
    } finally {
      setLoadingProcesos(false)
    }
  }, [selectedEmpleado])

  useEffect(() => {
    if (selectedEmpleado) {
      loadProcesos()
      setShowForm(false)
    } else {
      setProcesos([])
    }
  }, [selectedEmpleado, loadProcesos])

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "El archivo no puede exceder 10MB",
          variant: "destructive"
        })
        return
      }
      setArchivoAdjunto(file)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedEmpleado) {
      toast({
        title: "Error",
        description: "Seleccione un empleado primero",
        variant: "destructive"
      })
      return
    }

    if (!formData.causal.trim()) {
      toast({
        title: "Error",
        description: "La causal es requerida",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      let urlDocumento: string | null = null

      // Upload file if selected
      if (archivoAdjunto) {
        const formDataFile = new FormData()
        formDataFile.append("file", archivoAdjunto)
        formDataFile.append("bucket", "procesos-disciplinarios")
        formDataFile.append("folder", `empleado-${selectedEmpleado.id}`)

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formDataFile
        })

        const uploadData = await uploadRes.json()
        
        if (!uploadRes.ok || !uploadData.url) {
          throw new Error(uploadData.error || "Error al subir el archivo")
        }
        
        urlDocumento = uploadData.url
      }

      const res = await fetch("/api/rrhh/procesos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empleado_id: selectedEmpleado.id,
          causal: formData.causal.trim(),
          resultado: formData.resultado.trim() || null,
          fecha_sancion: formData.fecha_sancion,
          url_documento: urlDocumento
        })
      })
      
      const data = await res.json()
      
      if (data.success) {
        toast({
          title: "Proceso Registrado",
          description: "El proceso disciplinario se registro correctamente",
        })
        
        // Reset form and reload procesos
        setFormData({
          causal: "",
          resultado: "",
          fecha_sancion: new Date().toISOString().split("T")[0]
        })
        setArchivoAdjunto(null)
        setShowForm(false)
        loadProcesos()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo registrar el proceso",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00")
    return date.toLocaleDateString("es-HN", { 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procesos Disciplinarios</h1>
          <p className="text-sm text-gray-500 mt-1">Gestion de llamados de atencion y sanciones</p>
        </div>
      </div>

      {/* Employee Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-orange-500" />
            Seleccionar Empleado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCombobox}
                className="w-full justify-between h-11"
                disabled={loadingEmpleados}
              >
                {loadingEmpleados ? (
                  <span className="text-gray-400">Cargando empleados...</span>
                ) : selectedEmpleado ? (
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{selectedEmpleado.nombre_completo}</span>
                    <span className="text-xs text-gray-400">({selectedEmpleado.empresa})</span>
                  </span>
                ) : (
                  <span className="text-gray-400">Buscar empleado...</span>
                )}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar por nombre o identificacion..." />
                <CommandList>
                  <CommandEmpty>No se encontraron empleados.</CommandEmpty>
                  <CommandGroup>
                    {empleados.map((empleado) => (
                      <CommandItem
                        key={empleado.id}
                        value={`${empleado.nombre_completo} ${empleado.identificacion}`}
                        onSelect={() => {
                          setSelectedEmpleado(empleado)
                          setOpenCombobox(false)
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{empleado.nombre_completo}</span>
                          <span className="text-xs text-gray-500">
                            ID: {empleado.identificacion} | {empleado.empresa}
                          </span>
                        </div>
                        {selectedEmpleado?.id === empleado.id && (
                          <CheckCircle className="ml-auto h-4 w-4 text-green-500" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Content when employee is selected */}
      {selectedEmpleado && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timeline / History */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Historial de Sanciones
                </CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => setShowForm(true)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nueva Sancion
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingProcesos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : procesos.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Este empleado no tiene procesos disciplinarios registrados</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                  
                  <div className="space-y-4">
                    {procesos.map((proceso, index) => (
                      <div key={proceso.id} className="relative pl-10">
                        {/* Timeline dot */}
                        <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white ${
                          index === 0 ? "bg-orange-500" : "bg-gray-300"
                        }`} />
                        
                        <div className={`p-4 rounded-lg border ${
                          index === 0 ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-white"
                        }`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className={`w-4 h-4 ${
                                index === 0 ? "text-orange-500" : "text-gray-400"
                              }`} />
                              <span className="text-xs font-medium text-gray-500">
                                {formatDate(proceso.fecha_sancion)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Causal / Motivo</p>
                              <p className="text-sm text-gray-800 mt-0.5">{proceso.causal}</p>
                            </div>
                            
                            {proceso.resultado && (
                              <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sancion Aplicada</p>
                                <p className="text-sm text-gray-800 mt-0.5">{proceso.resultado}</p>
                              </div>
                            )}
                            
                            {/* Ver Documento Button */}
                            {proceso.url_documento && (
                              <div className="pt-2">
                                <a
                                  href={proceso.url_documento}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md transition-colors"
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                  Ver Documento
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* New Sancion Form */}
          <Card className={!showForm ? "opacity-50" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileWarning className="w-4 h-4 text-red-500" />
                Registrar Nueva Sancion
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!showForm ? (
                <div className="text-center py-8">
                  <FileWarning className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm mb-4">Haga clic en "Nueva Sancion" para registrar un proceso</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Nueva Sancion
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Empleado Info */}
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Empleado Seleccionado</p>
                    <p className="font-medium text-gray-900">{selectedEmpleado.nombre_completo}</p>
                    <p className="text-xs text-gray-500">{selectedEmpleado.identificacion} | {selectedEmpleado.empresa}</p>
                  </div>

                  {/* Fecha Sancion */}
                  <div className="space-y-2">
                    <Label htmlFor="fecha_sancion" className="text-sm font-medium">
                      Fecha de la Sancion
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="fecha_sancion"
                        type="date"
                        value={formData.fecha_sancion}
                        onChange={(e) => setFormData({ ...formData, fecha_sancion: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Causal */}
                  <div className="space-y-2">
                    <Label htmlFor="causal" className="text-sm font-medium">
                      Causal / Motivo <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="causal"
                      placeholder="Describa el motivo del llamado de atencion o sancion..."
                      value={formData.causal}
                      onChange={(e) => setFormData({ ...formData, causal: e.target.value })}
                      rows={4}
                      required
                    />
                  </div>

                  {/* Resultado */}
                  <div className="space-y-2">
                    <Label htmlFor="resultado" className="text-sm font-medium">
                      Resultado / Sancion Aplicada
                    </Label>
                    <Input
                      id="resultado"
                      placeholder="Ej: Amonestacion verbal, suspension 3 dias, etc."
                      value={formData.resultado}
                      onChange={(e) => setFormData({ ...formData, resultado: e.target.value })}
                    />
                  </div>

                  {/* Archivo Adjunto */}
                  <div className="space-y-2">
                    <Label htmlFor="archivo" className="text-sm font-medium">
                      Adjuntar Acta / Evidencia (Opcional)
                    </Label>
                    <div className="relative">
                      {!archivoAdjunto ? (
                        <label 
                          htmlFor="archivo"
                          className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
                        >
                          <Upload className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-500">Haga clic para seleccionar archivo</span>
                          <input
                            id="archivo"
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Paperclip className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-700 font-medium truncate max-w-[200px]">
                              {archivoAdjunto.name}
                            </span>
                            <span className="text-xs text-green-600">
                              ({(archivoAdjunto.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setArchivoAdjunto(null)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Formatos: PDF, DOC, DOCX, JPG, PNG. Max 10MB</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false)
                        setFormData({
                          causal: "",
                          resultado: "",
                          fecha_sancion: new Date().toISOString().split("T")[0]
                        })
                        setArchivoAdjunto(null)
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-orange-500 hover:bg-orange-600"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Registrando...
                        </>
                      ) : (
                        "Registrar Proceso"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state when no employee selected */}
      {!selectedEmpleado && !loadingEmpleados && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <User className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Seleccione un Empleado</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Use el buscador de arriba para seleccionar un empleado y ver su historial de procesos disciplinarios o registrar uno nuevo.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
