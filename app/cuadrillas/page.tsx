"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  UserPlus,
  Truck,
  Phone,
  Trash2,
  Search,
  Plus,
  Edit2,
  Loader2,
  ArrowLeft,
  Shield,
} from "lucide-react"

interface Cuadrilla {
  id: number
  nombre_cuadrilla: string
  lider_nombre: string
  telefono_lider: string | null
  vehiculo_placa: string | null
  activa: boolean
  created_at: string
}

interface Miembro {
  id: number
  cuadrilla_id: number
  nombre_tecnico: string
  rol_tecnico: string
}

export default function CuadrillasPage() {
  const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterActiva, setFilterActiva] = useState<string>("todas")

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false)
  const [editingCuadrilla, setEditingCuadrilla] = useState<Cuadrilla | null>(null)
  const [formNombre, setFormNombre] = useState("")
  const [formLider, setFormLider] = useState("")
  const [formTelefono, setFormTelefono] = useState("")
  const [formPlaca, setFormPlaca] = useState("")
  const [formContrasena, setFormContrasena] = useState("")
  const [formActiva, setFormActiva] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Members view
  const [selectedCuadrilla, setSelectedCuadrilla] = useState<Cuadrilla | null>(null)
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [loadingMiembros, setLoadingMiembros] = useState(false)
  const [showAddMiembro, setShowAddMiembro] = useState(false)
  const [miembroNombre, setMiembroNombre] = useState("")
  const [miembroRol, setMiembroRol] = useState("")
  const [addingMiembro, setAddingMiembro] = useState(false)

  useEffect(() => {
    loadCuadrillas()
  }, [])

  const loadCuadrillas = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterActiva === "activas") params.set("activa", "true")
      if (filterActiva === "inactivas") params.set("activa", "false")
      const res = await fetch(`/api/cuadrillas?${params}`)
      const data = await res.json()
      if (data.success) {
        setCuadrillas(data.data)
      }
    } catch (error) {
      console.error("Error loading cuadrillas:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCuadrillas()
  }, [filterActiva])

  const openCreate = () => {
    setEditingCuadrilla(null)
    setFormNombre("")
    setFormLider("")
    setFormTelefono("")
    setFormPlaca("")
    setFormContrasena("")
    setFormActiva(true)
    setShowModal(true)
  }

  const openEdit = (c: Cuadrilla) => {
    setEditingCuadrilla(c)
    setFormNombre(c.nombre_cuadrilla)
    setFormLider(c.lider_nombre)
    setFormTelefono(c.telefono_lider || "")
    setFormPlaca(c.vehiculo_placa || "")
    setFormContrasena("")
    setFormActiva(c.activa)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formNombre.trim() || !formLider.trim()) {
      alert("Nombre y Lider son requeridos")
      return
    }
    setSubmitting(true)
    try {
      const payload: any = {
        nombre_cuadrilla: formNombre.trim(),
        lider_nombre: formLider.trim(),
        telefono_lider: formTelefono.trim() || null,
        vehiculo_placa: formPlaca.trim() || null,
        activa: formActiva,
      }

      // Solo incluir contraseña si se proporciona
      if (formContrasena.trim()) {
        payload.contrasena = formContrasena.trim()
      }

      let res: Response
      if (editingCuadrilla) {
        res = await fetch(`/api/cuadrillas/${editingCuadrilla.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch("/api/cuadrillas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (data.success) {
        alert(editingCuadrilla ? "Cuadrilla actualizada" : "Cuadrilla creada")
        setShowModal(false)
        loadCuadrillas()
      } else {
        alert(data.error || "Error al guardar")
      }
    } catch (error) {
      console.error("Error saving cuadrilla:", error)
      alert("Error al guardar la cuadrilla")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (c: Cuadrilla) => {
    if (!confirm(`Eliminar "${c.nombre_cuadrilla}"? Se eliminaran tambien sus miembros.`)) return
    try {
      const res = await fetch(`/api/cuadrillas/${c.id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        alert("Cuadrilla eliminada")
        loadCuadrillas()
      } else {
        alert(data.error || "Error al eliminar")
      }
    } catch (error) {
      console.error("Error deleting cuadrilla:", error)
    }
  }

  const handleToggleActiva = async (c: Cuadrilla) => {
    try {
      const res = await fetch(`/api/cuadrillas/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activa: !c.activa }),
      })
      const data = await res.json()
      if (data.success) {
        loadCuadrillas()
      }
    } catch (error) {
      console.error("Error toggling cuadrilla:", error)
    }
  }

  // Members
  const openMiembros = async (c: Cuadrilla) => {
    setSelectedCuadrilla(c)
    setLoadingMiembros(true)
    try {
      const res = await fetch(`/api/cuadrillas/${c.id}/miembros`)
      const data = await res.json()
      if (data.success) {
        setMiembros(data.data)
      }
    } catch (error) {
      console.error("Error loading miembros:", error)
    } finally {
      setLoadingMiembros(false)
    }
  }

  const handleAddMiembro = async () => {
    if (!miembroNombre.trim() || !miembroRol || !selectedCuadrilla) return
    setAddingMiembro(true)
    try {
      const res = await fetch(`/api/cuadrillas/${selectedCuadrilla.id}/miembros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre_tecnico: miembroNombre.trim(), rol_tecnico: miembroRol }),
      })
      const data = await res.json()
      if (data.success) {
        setMiembroNombre("")
        setMiembroRol("")
        setShowAddMiembro(false)
        openMiembros(selectedCuadrilla)
      } else {
        alert(data.error || "Error al agregar miembro")
      }
    } catch (error) {
      console.error("Error adding miembro:", error)
    } finally {
      setAddingMiembro(false)
    }
  }

  const handleDeleteMiembro = async (miembroId: number) => {
    if (!selectedCuadrilla || !confirm("Eliminar este miembro?")) return
    try {
      const res = await fetch(`/api/cuadrillas/${selectedCuadrilla.id}/miembros?miembro_id=${miembroId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.success) {
        openMiembros(selectedCuadrilla)
      }
    } catch (error) {
      console.error("Error deleting miembro:", error)
    }
  }

  const getRolBadge = (rol: string) => {
    switch (rol?.toLowerCase()) {
      case "instalador": return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Instalador</Badge>
      case "asistente": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Asistente</Badge>
      case "chofer": return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Chofer</Badge>
      default: return <Badge variant="outline">{rol}</Badge>
    }
  }

  const filtered = cuadrillas.filter(
    (c) =>
      c.nombre_cuadrilla.toLowerCase().includes(search.toLowerCase()) ||
      c.lider_nombre.toLowerCase().includes(search.toLowerCase())
  )

  // Members detail view
  if (selectedCuadrilla) {
    return (
      <main className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedCuadrilla(null)}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{selectedCuadrilla.nombre_cuadrilla}</h1>
            <p className="text-sm text-gray-500">Lider: {selectedCuadrilla.lider_nombre}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Miembros de la Cuadrilla</h2>
          <Button
            size="sm"
            onClick={() => { setShowAddMiembro(true); setMiembroNombre(""); setMiembroRol("") }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <UserPlus className="w-4 h-4 mr-1" /> Agregar Miembro
          </Button>
        </div>

        {loadingMiembros ? (
          <div className="flex items-center gap-2 py-8 justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-sm text-gray-500">Cargando miembros...</span>
          </div>
        ) : miembros.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No hay miembros en esta cuadrilla</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border-gray-200">
            <table className="w-full">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Nombre</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Rol</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {miembros.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{m.nombre_tecnico}</td>
                    <td className="px-4 py-3">{getRolBadge(m.rol_tecnico)}</td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMiembro(m.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Add Member Dialog */}
        <Dialog open={showAddMiembro} onOpenChange={setShowAddMiembro}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Agregar Miembro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Nombre del Tecnico</label>
                <Input
                  value={miembroNombre}
                  onChange={(e) => setMiembroNombre(e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Rol</label>
                <Select value={miembroRol} onValueChange={setMiembroRol}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instalador">Instalador</SelectItem>
                    <SelectItem value="asistente">Asistente</SelectItem>
                    <SelectItem value="chofer">Chofer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddMiembro(false)}>Cancelar</Button>
                <Button
                  onClick={handleAddMiembro}
                  disabled={addingMiembro || !miembroNombre.trim() || !miembroRol}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {addingMiembro ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserPlus className="w-4 h-4 mr-1" />}
                  Agregar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    )
  }

  // Main grid view
  return (
    <main className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Gestion de Cuadrillas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Total: <span className="font-semibold">{cuadrillas.length}</span> cuadrillas
          </p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-1" /> Nueva Cuadrilla
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nombre o lider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72"
          />
        </div>
        <Select value={filterActiva} onValueChange={setFilterActiva}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="activas">Activas</SelectItem>
            <SelectItem value="inactivas">Inactivas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex items-center gap-2 py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span className="text-sm text-gray-500">Cargando cuadrillas...</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No se encontraron cuadrillas</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card
              key={c.id}
              className={`p-4 border transition-all hover:shadow-md cursor-pointer ${
                c.activa ? "border-blue-200 bg-white" : "border-gray-200 bg-gray-50 opacity-75"
              }`}
              onClick={() => openMiembros(c)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${c.activa ? "bg-blue-100" : "bg-gray-200"}`}>
                    <Users className={`w-4 h-4 ${c.activa ? "text-blue-600" : "text-gray-500"}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{c.nombre_cuadrilla}</h3>
                    <Badge className={c.activa ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700 hover:bg-red-100"}>
                      {c.activa ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(c)}
                    className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(c)}
                    className="h-7 w-7 p-0 text-gray-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-gray-700">
                  <Shield className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <span className="font-medium">Lider:</span> {c.lider_nombre}
                </div>
                {c.vehiculo_placa && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Truck className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <span className="font-medium">Placa:</span> {c.vehiculo_placa}
                  </div>
                )}
                {c.telefono_lider && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <span className="font-medium">Tel:</span> {c.telefono_lider}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-gray-500">Estado</span>
                <Switch
                  checked={c.activa}
                  onCheckedChange={() => handleToggleActiva(c)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCuadrilla ? "Editar Cuadrilla" : "Nueva Cuadrilla"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Nombre de la Cuadrilla</label>
              <Input
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                placeholder="Ej: Cuadrilla Norte"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Nombre del Lider</label>
              <Input
                value={formLider}
                onChange={(e) => setFormLider(e.target.value)}
                placeholder="Nombre completo del lider"
                className="border-blue-200 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Telefono de Contacto</label>
              <Input
                value={formTelefono}
                onChange={(e) => setFormTelefono(e.target.value)}
                placeholder="Numero de telefono"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Placa del Vehiculo</label>
              <Input
                value={formPlaca}
                onChange={(e) => setFormPlaca(e.target.value)}
                placeholder="Ej: ABC-1234"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-500" />
                Contraseña {editingCuadrilla && "(Dejar vacío para no cambiar)"}
              </label>
              <Input
                type="password"
                value={formContrasena}
                onChange={(e) => setFormContrasena(e.target.value)}
                placeholder={editingCuadrilla ? "Nueva contraseña (opcional)" : "Contraseña"}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Cuadrilla Activa</label>
              <Switch checked={formActiva} onCheckedChange={setFormActiva} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowModal(false)} disabled={submitting}>Cancelar</Button>
              <Button
                onClick={handleSave}
                disabled={submitting || !formNombre.trim() || !formLider.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {editingCuadrilla ? "Actualizar" : "Crear Cuadrilla"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
