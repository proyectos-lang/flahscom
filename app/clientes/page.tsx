"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { redirect } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react"

interface Cliente {
  id: number
  nombre_completo: string
  numero_identidad: string
  telefono: string | null
  direccion: string | null
  latitud: number | null
  longitud: number | null
  email: string | null
  created_at: string
}

export default function ClientesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchType, setSearchType] = useState<"nombre" | "id">("nombre")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 50

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    nombre_completo: "",
    numero_identidad: "",
    telefono: "",
    direccion: "",
    latitud: "",
    longitud: "",
    email: "",
  })

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Permission check
  useEffect(() => {
    if (!authLoading && (!user || !user.permissions?.clientes)) {
      redirect("/dashboard")
    }
  }, [user, authLoading])

  if (authLoading || !user || !user.permissions?.clientes) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    )
  }

  useEffect(() => {
    loadClientes()
  }, [currentPage, search, searchType])

  const loadClientes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        search: search,
        searchType: searchType,
      })

      const res = await fetch(`/api/clientes-crud?${params}`)
      const data = await res.json()

      if (data.success) {
        setClientes(data.clientes)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error("Error loading clientes:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    loadClientes()
  }

  const openCreateModal = () => {
    setEditingCliente(null)
    setFormData({
      nombre_completo: "",
      numero_identidad: "",
      telefono: "",
      direccion: "",
      latitud: "",
      longitud: "",
      email: "",
    })
    setShowModal(true)
  }

  const openEditModal = (cliente: Cliente) => {
    setEditingCliente(cliente)
    setFormData({
      nombre_completo: cliente.nombre_completo,
      numero_identidad: cliente.numero_identidad,
      telefono: cliente.telefono || "",
      direccion: cliente.direccion || "",
      latitud: cliente.latitud?.toString() || "",
      longitud: cliente.longitud?.toString() || "",
      email: cliente.email || "",
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!formData.nombre_completo || !formData.numero_identidad) {
      alert("Nombre completo y número de identidad son requeridos")
      return
    }

    setSubmitting(true)
    try {
      const url = editingCliente
        ? `/api/clientes-crud/${editingCliente.id}`
        : "/api/clientes-crud"

      const method = editingCliente ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (data.success) {
        alert(editingCliente ? "Cliente actualizado" : "Cliente creado")
        setShowModal(false)
        loadClientes()
      } else {
        alert(data.error || "Error al guardar cliente")
      }
    } catch (error) {
      console.error("Error saving cliente:", error)
      alert("Error al guardar cliente")
    } finally {
      setSubmitting(false)
    }
  }

  const openDeleteConfirm = (cliente: Cliente) => {
    setClienteToDelete(cliente)
    setShowDeleteConfirm(true)
  }

  const handleDelete = async () => {
    if (!clienteToDelete) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/clientes-crud/${clienteToDelete.id}`, {
        method: "DELETE",
      })

      const data = await res.json()

      if (data.success) {
        alert("Cliente eliminado")
        setShowDeleteConfirm(false)
        setClienteToDelete(null)
        loadClientes()
      } else {
        alert(data.error || "Error al eliminar cliente")
      }
    } catch (error) {
      console.error("Error deleting cliente:", error)
      alert("Error al eliminar cliente")
    } finally {
      setDeleting(false)
    }
  }

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-orange-500" />
              Gestión de Clientes
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Total de clientes: <span className="font-semibold text-orange-600">{total}</span>
            </p>
          </div>
          <Button onClick={openCreateModal} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Select value={searchType} onValueChange={(v: any) => setSearchType(v)}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nombre">Por Nombre</SelectItem>
                <SelectItem value="id">Por ID</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type={searchType === "id" ? "number" : "text"}
              placeholder={searchType === "id" ? "ID del cliente..." : "Nombre del cliente..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-orange-50 to-blue-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">ID</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Nombre</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Identidad</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Teléfono</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Email</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Dirección</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Ubicación</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-500" />
                    </td>
                  </tr>
                ) : clientes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-500">
                      No se encontraron clientes
                    </td>
                  </tr>
                ) : (
                  clientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-2 text-xs font-semibold text-orange-600">#{cliente.id}</td>
                      <td className="px-3 py-2 text-xs text-gray-900">{cliente.nombre_completo}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{cliente.numero_identidad}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{cliente.telefono || "--"}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{cliente.email || "--"}</td>
                      <td className="px-3 py-2 text-xs text-gray-700 max-w-xs truncate">
                        {cliente.direccion || "--"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {cliente.latitud && cliente.longitud ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openGoogleMaps(cliente.latitud!, cliente.longitud!)}
                            className="h-7 px-2 text-blue-600 hover:text-blue-800"
                          >
                            <MapPin className="w-3 h-3" />
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">--</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(cliente)}
                            className="h-7 px-2"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteConfirm(cliente)}
                            className="h-7 px-2 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || loading}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCliente ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <Input
                  value={formData.nombre_completo}
                  onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Identidad *
                </label>
                <Input
                  value={formData.numero_identidad}
                  onChange={(e) => setFormData({ ...formData, numero_identidad: e.target.value })}
                  placeholder="0801-1234-12345"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <Input
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="9999-9999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="cliente@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <Input
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                placeholder="Calle Principal, Colonia Centro"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitud</label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={formData.latitud}
                  onChange={(e) => setFormData({ ...formData, latitud: e.target.value })}
                  placeholder="14.12345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitud</label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={formData.longitud}
                  onChange={(e) => setFormData({ ...formData, longitud: e.target.value })}
                  placeholder="-87.12345678"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowModal(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          {clienteToDelete && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                ¿Estás seguro que deseas eliminar al cliente{" "}
                <span className="font-semibold text-gray-900">{clienteToDelete.nombre_completo}</span>?
              </p>
              <p className="text-xs text-red-600">
                Esta acción no se puede deshacer. El cliente no se puede eliminar si tiene contratos
                asociados.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
