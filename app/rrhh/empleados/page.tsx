"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Loader2,
  UserCircle,
  Building2,
  Upload,
  Eye,
  FileText,
  Download,
  DollarSign,
  Bus,
  ShieldCheck,
  X,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { exportToExcel } from "@/lib/export-excel"

interface Empleado {
  id: number
  identificacion: string
  nombre_completo: string
  puesto: string | null
  direccion: string
  empresa: string
  correo_personal: string
  fecha_ingreso: string
  tipo_pago: string
  // Allow empty string in the form so the inputs can render blank by default
  // (instead of forcing the user to clear a "0"). On submit these are coerced
  // to numbers by the API helpers.
  salario_base: number | ""
  viaticos_transporte: number | ""
  // Monthly insurance deduction applied to the employee's payroll.
  seguro: number | ""
  activo: boolean
  url_cv: string | null
  url_antecedentes_policiales: string | null
  url_antecedentes_penales: string | null
  url_dni: string | null
  url_licencia: string | null
  url_solicitud_empleo: string | null
}

// Predefined puesto options. "Otro" unlocks a free-text input in the form.
const PUESTOS_PREDEFINIDOS = [
  "Tecnico Instalador",
  "Asesor de Ventas",
  "Coordinador",
  "Administrador",
  "Recursos Humanos",
  "Almacen",
] as const

const emptyForm = {
  identificacion: "",
  nombre_completo: "",
  puesto: "",
  direccion: "",
  empresa: "FLASHCOM",
  correo_personal: "",
  fecha_ingreso: new Date().toISOString().split("T")[0],
  tipo_pago: "quincenal",
  salario_base: "" as number | "",
  viaticos_transporte: "" as number | "",
  seguro: "" as number | "",
  activo: true,
}

const documentFields = [
  { key: "url_cv", label: "CV", shortLabel: "CV" },
  { key: "url_antecedentes_policiales", label: "Ant. Policiales", shortLabel: "Policiales" },
  { key: "url_antecedentes_penales", label: "Ant. Penales", shortLabel: "Penales" },
  { key: "url_dni", label: "DNI", shortLabel: "DNI" },
  { key: "url_licencia", label: "Licencia", shortLabel: "Licencia" },
  { key: "url_solicitud_empleo", label: "Solicitud", shortLabel: "Solicitud" },
]

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterEmpresa, setFilterEmpresa] = useState<string>("todas")
  const [filterPuesto, setFilterPuesto] = useState<string>("todos")
  // Tracks whether the "puesto" field in the form is using the custom/Other
  // text input vs one of the predefined dropdown options.
  const [puestoIsOther, setPuestoIsOther] = useState<boolean>(false)
  const { toast } = useToast()

  // Sheet/Drawer state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Inline upload state
  const [uploadingDoc, setUploadingDoc] = useState<{ empId: number; field: string } | null>(null)
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  // Form state
  const [form, setForm] = useState(emptyForm)

  // Multi-select + bulk update state. `bulkField` decides which value is being
  // changed across the selected employees; null means no dialog is open.
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkField, setBulkField] = useState<null | "salario_base" | "viaticos_transporte" | "seguro">(null)
  const [bulkValue, setBulkValue] = useState<string>("")
  const [bulkSubmitting, setBulkSubmitting] = useState(false)

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setSelectionMode(false)
  }

  const BULK_FIELD_META: Record<
    "salario_base" | "viaticos_transporte" | "seguro",
    { label: string }
  > = {
    salario_base: { label: "Salario base" },
    viaticos_transporte: { label: "Viatico de transporte" },
    seguro: { label: "Seguro" },
  }

  const openBulkDialog = (field: "salario_base" | "viaticos_transporte" | "seguro") => {
    if (selectedIds.size === 0) {
      toast({
        title: "Sin seleccion",
        description: "Seleccione al menos un empleado",
        variant: "destructive",
      })
      return
    }
    setBulkField(field)
    setBulkValue("")
  }

  const handleBulkUpdate = async () => {
    if (!bulkField) return
    const numeric = Number(bulkValue)
    if (bulkValue === "" || Number.isNaN(numeric) || numeric < 0) {
      toast({
        title: "Valor invalido",
        description: "Ingrese un monto valido (mayor o igual a 0)",
        variant: "destructive",
      })
      return
    }

    setBulkSubmitting(true)
    try {
      const targets = empleados.filter((e) => selectedIds.has(e.id))
      // Reuse the per-employee PUT endpoint, sending the full record with the
      // single changed field so we don't drop existing data.
      const results = await Promise.all(
        targets.map((emp) =>
          fetch(`/api/rrhh/empleados/${emp.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...emp, [bulkField]: numeric }),
          }).then((r) => r.json()).catch(() => ({ success: false }))
        )
      )

      const ok = results.filter((r) => r?.success).length
      const failed = results.length - ok

      toast({
        title: "Actualizacion masiva completada",
        description: `${ok} empleado(s) actualizados${failed ? `, ${failed} con error` : ""}`,
        variant: failed ? "destructive" : undefined,
      })

      setBulkField(null)
      setBulkValue("")
      clearSelection()
      loadEmpleados()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo completar la actualizacion masiva",
        variant: "destructive",
      })
    } finally {
      setBulkSubmitting(false)
    }
  }

  const loadEmpleados = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/rrhh/empleados")
      const data = await res.json()
      if (data.success) {
        setEmpleados(data.data || [])
      }
    } catch (error) {
      console.error("Error loading empleados:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEmpleados()
  }, [loadEmpleados])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const openNewEmployee = () => {
    resetForm()
    setPuestoIsOther(false)
    setSheetOpen(true)
  }

  const openEditEmployee = (emp: Empleado) => {
    setEditingId(emp.id)
    const puestoValue = emp.puesto || ""
    // If the stored puesto is not in the predefined list, treat it as "Otro"
    setPuestoIsOther(
      !!puestoValue && !PUESTOS_PREDEFINIDOS.includes(puestoValue as any)
    )
    setForm({
      identificacion: emp.identificacion || "",
      nombre_completo: emp.nombre_completo || "",
      puesto: puestoValue,
      direccion: emp.direccion || "",
      empresa: emp.empresa || "FLASHCOM",
      correo_personal: emp.correo_personal || "",
      fecha_ingreso: emp.fecha_ingreso || "",
      tipo_pago: emp.tipo_pago || "quincenal",
      // Use null/undefined check (not falsy) so a stored 0 still renders as 0
      // instead of being replaced with blank.
      salario_base: emp.salario_base ?? "",
      viaticos_transporte: emp.viaticos_transporte ?? "",
      seguro: emp.seguro ?? "",
      activo: emp.activo ?? true,
    })
    setSheetOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.nombre_completo || !form.identificacion) {
      toast({
        title: "Error",
        description: "Complete los campos obligatorios (Nombre e Identificacion)",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const url = editingId 
        ? `/api/rrhh/empleados/${editingId}` 
        : "/api/rrhh/empleados"
      
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      
      if (data.success) {
        toast({ 
          title: "Exito", 
          description: editingId ? "Empleado actualizado correctamente" : "Empleado registrado correctamente" 
        })
        setSheetOpen(false)
        resetForm()
        loadEmpleados()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el empleado",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (emp: Empleado) => {
    try {
      const res = await fetch(`/api/rrhh/empleados/${emp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...emp, activo: !emp.activo }),
      })
      const data = await res.json()
      
      if (data.success) {
        toast({ 
          title: "Exito", 
          description: `Empleado ${!emp.activo ? "activado" : "desactivado"} correctamente` 
        })
        loadEmpleados()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado",
        variant: "destructive",
      })
    }
  }

  // Inline document upload handler
  const handleInlineDocUpload = async (empId: number, field: string, file: File) => {
    setUploadingDoc({ empId, field })
    try {
      // 1. Upload file to storage
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", "rrhh/documentos")

      const uploadRes = await fetch("/api/rrhh/upload", {
        method: "POST",
        body: formData,
      })
      const uploadData = await uploadRes.json()

      if (!uploadData.url) {
        throw new Error("No se obtuvo URL del archivo")
      }

      // 2. Update employee record with new URL
      const emp = empleados.find(e => e.id === empId)
      if (!emp) throw new Error("Empleado no encontrado")

      const updateRes = await fetch(`/api/rrhh/empleados/${empId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...emp, [field]: uploadData.url }),
      })
      const updateData = await updateRes.json()

      if (updateData.success) {
        toast({ title: "Exito", description: "Documento subido correctamente" })
        loadEmpleados()
      } else {
        throw new Error("Error al actualizar empleado")
      }
    } catch (error) {
      console.error("Error uploading document:", error)
      toast({
        title: "Error",
        description: "No se pudo subir el documento",
        variant: "destructive",
      })
    } finally {
      setUploadingDoc(null)
    }
  }

  const triggerFileInput = (empId: number, field: string) => {
    const key = `${empId}-${field}`
    fileInputRefs.current[key]?.click()
  }

  // Unique list of puestos present in the dataset (includes custom/Other values)
  const puestosDisponibles = Array.from(
    new Set(
      empleados
        .map((e) => e.puesto)
        .filter((p): p is string => !!p && p.trim().length > 0)
    )
  ).sort()

  const filteredEmpleados = empleados.filter(emp => {
    const searchLower = search.toLowerCase()
    const matchSearch =
      emp.nombre_completo?.toLowerCase().includes(searchLower) ||
      emp.identificacion?.includes(search) ||
      emp.puesto?.toLowerCase().includes(searchLower)
    const matchEmpresa = filterEmpresa === "todas" || emp.empresa === filterEmpresa
    const matchPuesto = filterPuesto === "todos" || emp.puesto === filterPuesto
    return matchSearch && matchEmpresa && matchPuesto
  })

  // Export ALL employees (regardless of current filters) as a CSV file
  const exportEmpleadosExcel = () => {
    if (!empleados || empleados.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay empleados para exportar",
        variant: "destructive",
      })
      return
    }

    const headers = [
      "ID",
      "Identificacion",
      "Nombre Completo",
      "Puesto",
      "Empresa",
      "Correo",
      "Direccion",
      "Fecha Ingreso",
      "Tipo Pago",
    "Salario Base",
    "Viaticos",
    "Seguro",
    "Estado",
    ]

    const rows = empleados.map((e) => [
      e.id,
      e.identificacion || "",
      e.nombre_completo || "",
      e.puesto || "",
      e.empresa || "",
      e.correo_personal || "",
      e.direccion || "",
      e.fecha_ingreso || "",
      e.tipo_pago || "",
      Number(e.salario_base || 0),
      Number(e.viaticos_transporte || 0),
      Number(e.seguro || 0),
      // Human-readable status: clearer than "Si"/"No" when reviewing in Excel
      e.activo ? "Activo" : "Inactivo",
    ])

    const today = new Date().toISOString().slice(0, 10)
    exportToExcel({ filename: `empleados_${today}`, sheetName: "Empleados", headers, rows })

    toast({
      title: "Exportado",
      description: `Se exportaron ${empleados.length} empleados`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Headcount - Empleados</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona el expediente del personal</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={selectionMode ? "default" : "outline"}
            onClick={() => {
              if (selectionMode) clearSelection()
              else setSelectionMode(true)
            }}
            className={selectionMode ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
          >
            <Users className="w-4 h-4 mr-2" />
            {selectionMode ? "Cancelar seleccion" : "Seleccion multiple"}
          </Button>
          <Button
            onClick={exportEmpleadosExcel}
            disabled={filteredEmpleados.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
          <Button onClick={openNewEmployee} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Empleado
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, identificacion o puesto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <select
              value={filterPuesto}
              onChange={(e) => setFilterPuesto(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm min-w-[160px]"
              aria-label="Filtrar por puesto"
            >
              <option value="todos">Todos los puestos</option>
              {/* Predefined puestos first, then any custom ones present in the data */}
              {PUESTOS_PREDEFINIDOS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              {puestosDisponibles
                .filter((p) => !PUESTOS_PREDEFINIDOS.includes(p as any))
                .map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
            </select>
            <select
              value={filterEmpresa}
              onChange={(e) => setFilterEmpresa(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="todas">Todas las empresas</option>
              <option value="FLASHCOM">FLASHCOM</option>
              <option value="SIDH">SIDH</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions toolbar (selection mode) */}
      {selectionMode && (
        <Card className="border-blue-200 bg-blue-50/60">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={
                    filteredEmpleados.length > 0 &&
                    filteredEmpleados.every((e) => selectedIds.has(e.id))
                  }
                  onCheckedChange={(checked) => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev)
                      if (checked) filteredEmpleados.forEach((e) => next.add(e.id))
                      else filteredEmpleados.forEach((e) => next.delete(e.id))
                      return next
                    })
                  }}
                />
                <span className="text-sm font-medium text-gray-700">
                  {selectedIds.size} seleccionado(s)
                </span>
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-3 h-3" /> Limpiar
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => openBulkDialog("salario_base")}
                  disabled={selectedIds.size === 0}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Cambiar salario
                </Button>
                <Button
                  size="sm"
                  onClick={() => openBulkDialog("viaticos_transporte")}
                  disabled={selectedIds.size === 0}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Bus className="w-4 h-4 mr-1" />
                  Cambiar viatico
                </Button>
                <Button
                  size="sm"
                  onClick={() => openBulkDialog("seguro")}
                  disabled={selectedIds.size === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <ShieldCheck className="w-4 h-4 mr-1" />
                  Cambiar seguro
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-500" />
            Empleados ({filteredEmpleados.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : filteredEmpleados.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No se encontraron empleados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {selectionMode && <th className="w-10 py-3 px-3" aria-label="Seleccionar" />}
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">Nombre</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">Puesto</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">Identificacion</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">Empresa</th>
                    <th className="text-right py-3 px-3 font-semibold text-gray-600">Seguro</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600 min-w-[380px]">Documentos</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-600">Estado</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmpleados.map((emp) => (
                    <tr
                      key={emp.id}
                      className={`border-b border-gray-50 hover:bg-gray-50 ${
                        selectionMode && selectedIds.has(emp.id) ? "bg-blue-50/70" : ""
                      }`}
                    >
                      {selectionMode && (
                        <td className="py-3 px-3">
                          <Checkbox
                            checked={selectedIds.has(emp.id)}
                            onCheckedChange={() => toggleSelected(emp.id)}
                            aria-label={`Seleccionar ${emp.nombre_completo}`}
                          />
                        </td>
                      )}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
                            <UserCircle className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{emp.nombre_completo}</p>
                            <p className="text-xs text-gray-400">{emp.correo_personal || "Sin correo"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {emp.puesto ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {emp.puesto}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Sin asignar</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-600 font-mono text-xs">{emp.identificacion}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          emp.empresa === "FLASHCOM" 
                            ? "bg-orange-100 text-orange-700" 
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          <Building2 className="w-3 h-3" />
                          {emp.empresa}
                        </span>
                      </td>
                      {/* Insurance deduction, formatted as Honduran Lempira */}
                      <td className="py-3 px-3 text-right font-medium text-gray-700 whitespace-nowrap">
                        {`L. ${Number(emp.seguro || 0).toLocaleString("es-HN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`}
                      </td>
                      {/* Documents Column */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1.5">
                          {documentFields.map((doc) => {
                            const hasDoc = !!(emp[doc.key as keyof Empleado])
                            const isUploading = uploadingDoc?.empId === emp.id && uploadingDoc?.field === doc.key
                            const inputKey = `${emp.id}-${doc.key}`

                            return (
                              <div key={doc.key} className="relative">
                                {/* Hidden file input */}
                                <input
                                  type="file"
                                  ref={(el) => { fileInputRefs.current[inputKey] = el }}
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                      handleInlineDocUpload(emp.id, doc.key, file)
                                    }
                                    e.target.value = "" // Reset input
                                  }}
                                  className="hidden"
                                />
                                
                                {/* Document button */}
                                {isUploading ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-orange-100 text-orange-700">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Subiendo...
                                  </span>
                                ) : hasDoc ? (
                                  <button
                                    onClick={() => {
                                      const url = emp[doc.key as keyof Empleado] as string
                                      window.open(url, "_blank")
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                    title={`Ver ${doc.label}`}
                                  >
                                    <Eye className="w-3 h-3" />
                                    {doc.shortLabel}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => triggerFileInput(emp.id, doc.key)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                                    title={`Subir ${doc.label}`}
                                  >
                                    <Upload className="w-3 h-3" />
                                    {doc.shortLabel}
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={emp.activo}
                            onCheckedChange={() => handleToggleActive(emp)}
                            className="data-[state=checked]:bg-green-500"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditEmployee(emp)}
                            className="h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheet/Drawer for Add/Edit Employee (without documents section) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-orange-500" />
              {editingId ? "Editar Empleado" : "Nuevo Empleado"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Informacion Personal</h3>
              
              <div>
                <Label className="text-xs">Identificacion (DNI) *</Label>
                <Input
                  value={form.identificacion}
                  onChange={(e) => setForm({ ...form, identificacion: e.target.value })}
                  placeholder="0000-0000-00000"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Nombre Completo *</Label>
                <Input
                  value={form.nombre_completo}
                  onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                  placeholder="Nombre del empleado"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Puesto / Cargo</Label>
                <select
                  value={puestoIsOther ? "__OTRO__" : form.puesto}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === "__OTRO__") {
                      // Switch to custom free-text mode; clear stored value so the
                      // user can type a new custom puesto.
                      setPuestoIsOther(true)
                      setForm({ ...form, puesto: "" })
                    } else {
                      setPuestoIsOther(false)
                      setForm({ ...form, puesto: val })
                    }
                  }}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Seleccione un puesto...</option>
                  {PUESTOS_PREDEFINIDOS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  <option value="__OTRO__">Otro (especificar)</option>
                </select>
                {puestoIsOther && (
                  <Input
                    value={form.puesto}
                    onChange={(e) => setForm({ ...form, puesto: e.target.value })}
                    placeholder="Escriba el puesto personalizado"
                    className="mt-2"
                  />
                )}
              </div>

              <div>
                <Label className="text-xs">Direccion</Label>
                <Input
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  placeholder="Direccion del empleado"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Correo Personal</Label>
                <Input
                  type="email"
                  value={form.correo_personal}
                  onChange={(e) => setForm({ ...form, correo_personal: e.target.value })}
                  placeholder="correo@personal.com"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Employment Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Informacion Laboral</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Empresa</Label>
                  <select
                    value={form.empresa}
                    onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="FLASHCOM">FLASHCOM</option>
                    <option value="SIDH">SIDH</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs">Fecha de Ingreso</Label>
                  <Input
                    type="date"
                    value={form.fecha_ingreso}
                    onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tipo de Pago</Label>
                  <select
                    value={form.tipo_pago}
                    onChange={(e) => setForm({ ...form, tipo_pago: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs">Salario Base (L)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.salario_base}
                    onChange={(e) => {
                      const v = e.target.value
                      // Keep the field truly blank when the user clears it
                      setForm({ ...form, salario_base: v === "" ? "" : parseFloat(v) })
                    }}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Viaticos Transporte (L)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.viaticos_transporte}
                    onChange={(e) => {
                      const v = e.target.value
                      setForm({ ...form, viaticos_transporte: v === "" ? "" : parseFloat(v) })
                    }}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Deduccion de Seguro (L)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.seguro}
                    onChange={(e) => {
                      const v = e.target.value
                      setForm({ ...form, seguro: v === "" ? "" : parseFloat(v) })
                    }}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Note about documents */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-blue-700">Documentos del Expediente</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Los documentos se gestionan directamente desde la tabla de empleados. 
                    Guarde primero el empleado y luego suba los documentos desde la columna "Documentos".
                  </p>
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSheetOpen(false)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                editingId ? "Actualizar" : "Registrar"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Bulk update dialog */}
      <Dialog open={bulkField !== null} onOpenChange={(open) => !open && setBulkField(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Cambiar {bulkField ? BULK_FIELD_META[bulkField].label.toLowerCase() : ""} masivamente
            </DialogTitle>
            <DialogDescription>
              Se aplicara el mismo valor a los {selectedIds.size} empleado(s) seleccionados. Esta
              accion sobreescribe el valor actual.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Label className="text-xs">
              Nuevo valor de {bulkField ? BULK_FIELD_META[bulkField].label.toLowerCase() : ""} (L)
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              placeholder="0.00"
              className="mt-1"
            />
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkField(null)} disabled={bulkSubmitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleBulkUpdate}
              disabled={bulkSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {bulkSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Aplicando...
                </>
              ) : (
                `Aplicar a ${selectedIds.size} empleado(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
