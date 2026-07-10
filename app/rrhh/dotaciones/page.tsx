"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  Package,
  Plus,
  User,
  Calendar,
  Loader2,
  CheckCircle,
  ChevronDown,
  Upload,
  FileText,
  X,
  Search,
  Filter,
  Eye,
} from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Empleado {
  id: number
  nombre_completo: string
  identificacion: string
  empresa: string
  activo: boolean
}

interface Dotacion {
  id: number
  empleado_id: number
  articulo_entregado: string
  fecha_entrega: string
  url_documento_firmado: string | null
  empleado_nombre: string
  empleado_identificacion: string
  empleado_empresa: string
}

function formatDate(iso: string): string {
  if (!iso) return "-"
  return new Date(iso + "T00:00:00").toLocaleDateString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function DotacionesPage() {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [loadingList, setLoadingList] = useState(false)

  // Employees for selector
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loadingEmpleados, setLoadingEmpleados] = useState(true)
  const [openCombobox, setOpenCombobox] = useState(false)
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null)

  // Form fields
  const [descripcion, setDescripcion] = useState("")
  const [fechaEntrega, setFechaEntrega] = useState(() => new Date().toISOString().split("T")[0])
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)

  // History (all deliveries)
  const [dotaciones, setDotaciones] = useState<Dotacion[]>([])

  // Filters for history
  const [searchText, setSearchText] = useState("")
  const [filtroDesde, setFiltroDesde] = useState("")
  const [filtroHasta, setFiltroHasta] = useState("")

  // Load employees
  useEffect(() => {
    const loadEmpleados = async () => {
      try {
        const res = await fetch("/api/rrhh/empleados?activo=true")
        const data = await res.json()
        if (data.success) {
          setEmpleados(data.data || [])
        }
      } catch (e) {
        console.error("Error loading empleados:", e)
      } finally {
        setLoadingEmpleados(false)
      }
    }
    loadEmpleados()
  }, [])

  // Load all dotaciones (history)
  const loadDotaciones = useCallback(async () => {
    setLoadingList(true)
    try {
      const params = new URLSearchParams()
      if (filtroDesde) params.set("fecha_desde", filtroDesde)
      if (filtroHasta) params.set("fecha_hasta", filtroHasta)
      const res = await fetch(`/api/rrhh/dotaciones?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setDotaciones(data.data || [])
      }
    } catch (e) {
      console.error("Error loading dotaciones:", e)
    } finally {
      setLoadingList(false)
    }
  }, [filtroDesde, filtroHasta])

  useEffect(() => {
    loadDotaciones()
  }, [loadDotaciones])

  // Client-side text search (by employee name or description)
  const dotacionesFiltradas = useMemo(() => {
    const term = searchText.trim().toLowerCase()
    if (!term) return dotaciones
    return dotaciones.filter(
      (d) =>
        (d.empleado_nombre || "").toLowerCase().includes(term) ||
        (d.empleado_identificacion || "").toLowerCase().includes(term) ||
        (d.articulo_entregado || "").toLowerCase().includes(term),
    )
  }, [dotaciones, searchText])

  const resetForm = () => {
    setDescripcion("")
    setFechaEntrega(new Date().toISOString().split("T")[0])
    setPdfFile(null)
    setUploadedUrl(null)
    setSelectedEmpleado(null)
  }

  const handleFilePick = (file: File | null) => {
    if (!file) {
      setPdfFile(null)
      setUploadedUrl(null)
      return
    }
    // Accept PDF + images as fallback (per spec the flow allows photo-of-document)
    const okType =
      file.type === "application/pdf" ||
      file.type.startsWith("image/") ||
      file.name.toLowerCase().endsWith(".pdf")
    if (!okType) {
      toast({
        title: "Formato no permitido",
        description: "Solo se aceptan archivos PDF o imagenes",
        variant: "destructive",
      })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El archivo excede los 10 MB permitidos",
        variant: "destructive",
      })
      return
    }
    setPdfFile(file)
    setUploadedUrl(null)
  }

  // Upload the signed PDF to Supabase Storage. Returns the public URL or null.
  const uploadPdf = async (empleadoId: number): Promise<string | null> => {
    if (!pdfFile) return null
    setUploadingFile(true)
    try {
      const fd = new FormData()
      fd.append("file", pdfFile)
      fd.append("empleado_id", String(empleadoId))
      const res = await fetch("/api/rrhh/dotaciones/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al subir PDF")
      }
      return data.url as string
    } finally {
      setUploadingFile(false)
    }
  }

  const handleRegistrar = async () => {
    if (!selectedEmpleado) {
      toast({ title: "Error", description: "Seleccione un empleado", variant: "destructive" })
      return
    }
    if (!descripcion.trim()) {
      toast({
        title: "Error",
        description: "Ingrese la descripcion de la entrega",
        variant: "destructive",
      })
      return
    }
    if (!fechaEntrega) {
      toast({
        title: "Error",
        description: "Seleccione la fecha de entrega",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      // Upload PDF first (if provided); only then persist the delivery
      const uploadedFileUrl = pdfFile ? await uploadPdf(selectedEmpleado.id) : null

      const res = await fetch("/api/rrhh/dotaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empleado_id: selectedEmpleado.id,
          articulo_entregado: descripcion.trim(),
          fecha_entrega: fechaEntrega,
          url_documento_firmado: uploadedFileUrl,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: "Entrega registrada",
          description: `Se registro la entrega a ${selectedEmpleado.nombre_completo}`,
        })
        resetForm()
        loadDotaciones()
      } else {
        throw new Error(data.error || "Error al registrar")
      }
    } catch (e) {
      console.error("Error registering dotacion:", e)
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo registrar la entrega",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const totalConRespaldo = dotacionesFiltradas.filter((d) => !!d.url_documento_firmado).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-orange-500" />
            Dotaciones y Equipo
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Registro de uniformes y herramientas entregadas al personal con respaldo firmado
          </p>
        </div>
      </div>

      {/* Delivery Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4 text-green-500" />
            Registrar Nueva Entrega
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Empleado */}
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-gray-500" />
                Empleado
              </Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between h-auto py-2"
                    disabled={loadingEmpleados}
                  >
                    {loadingEmpleados ? (
                      <span className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cargando...
                      </span>
                    ) : selectedEmpleado ? (
                      <div className="flex flex-col items-start text-left">
                        <span className="font-medium truncate max-w-[240px]">
                          {selectedEmpleado.nombre_completo}
                        </span>
                        <span className="text-xs text-gray-500">
                          {selectedEmpleado.identificacion}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500">Buscar empleado...</span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por nombre o identificacion..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron empleados.</CommandEmpty>
                      <CommandGroup>
                        {empleados.map((emp) => (
                          <CommandItem
                            key={emp.id}
                            value={`${emp.nombre_completo} ${emp.identificacion}`}
                            onSelect={() => {
                              setSelectedEmpleado(emp)
                              setOpenCombobox(false)
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{emp.nombre_completo}</span>
                              <span className="text-xs text-gray-500">
                                {emp.identificacion} - {emp.empresa}
                              </span>
                            </div>
                            {selectedEmpleado?.id === emp.id && (
                              <CheckCircle className="ml-auto h-4 w-4 text-green-500" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Fecha */}
            <div className="space-y-2">
              <Label htmlFor="fecha" className="text-sm flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                Fecha de Entrega
              </Label>
              <Input
                id="fecha"
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
              />
            </div>

            {/* Descripcion */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="descripcion" className="text-sm">
                Descripcion de la Dotacion
              </Label>
              <Textarea
                id="descripcion"
                placeholder="Ej: Kit de seguridad: Casco, Guantes, Botas; 2 camisas bordadas, 1 par de botas..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Upload PDF */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                Documento Firmado (PDF o imagen)
              </Label>
              {pdfFile ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-md border border-dashed border-orange-300 bg-orange-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{pdfFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(pdfFile.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFilePick(null)}
                    className="h-7 w-7 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="pdf-upload"
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-md border-2 border-dashed border-gray-300 hover:border-orange-400 hover:bg-orange-50 cursor-pointer transition-colors"
                >
                  <Upload className="w-6 h-6 text-gray-400" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">Subir Documento Firmado</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      PDF o imagen, hasta 10 MB
                    </p>
                  </div>
                  <input
                    id="pdf-upload"
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => handleFilePick(e.target.files?.[0] || null)}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              onClick={handleRegistrar}
              disabled={!selectedEmpleado || !descripcion.trim() || submitting || uploadingFile}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {submitting || uploadingFile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploadingFile ? "Subiendo documento..." : "Registrando..."}
                </>
              ) : (
                <>
                  <Package className="w-4 h-4 mr-2" />
                  Registrar Entrega
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-500" />
              Historial de Dotaciones ({dotacionesFiltradas.length})
            </CardTitle>
            <span className="text-xs text-gray-500">
              {totalConRespaldo} con respaldo / {dotacionesFiltradas.length - totalConRespaldo} sin
              respaldo
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por empleado o descripcion..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="date"
                value={filtroDesde}
                onChange={(e) => setFiltroDesde(e.target.value)}
                className="pl-9 h-9 text-sm"
                placeholder="Desde"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="date"
                value={filtroHasta}
                onChange={(e) => setFiltroHasta(e.target.value)}
                className="pl-9 h-9 text-sm"
                placeholder="Hasta"
              />
            </div>
            {(searchText || filtroDesde || filtroHasta) && (
              <div className="md:col-span-4 flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSearchText("")
                    setFiltroDesde("")
                    setFiltroHasta("")
                  }}
                  className="h-7 text-xs"
                >
                  <Filter className="w-3 h-3 mr-1" />
                  Limpiar filtros
                </Button>
              </div>
            )}
          </div>

          {/* Table */}
          {loadingList ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : dotacionesFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Package className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No hay dotaciones que coincidan con los filtros</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Fecha</TableHead>
                    <TableHead className="font-semibold">Empleado</TableHead>
                    <TableHead className="font-semibold">Descripcion</TableHead>
                    <TableHead className="font-semibold text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dotacionesFiltradas.map((dot) => (
                    <TableRow key={dot.id} className="hover:bg-gray-50">
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(dot.fecha_entrega)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {dot.empleado_nombre || "-"}
                          </span>
                          {dot.empleado_identificacion && (
                            <span className="text-xs text-gray-500">
                              {dot.empleado_identificacion}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <span className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                          {dot.articulo_entregado}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {dot.url_documento_firmado ? (
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                          >
                            <a
                              href={dot.url_documento_firmado}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1.5" />
                              Ver Respaldo
                            </a>
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <Eye className="w-3 h-3" />
                            Sin respaldo
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
