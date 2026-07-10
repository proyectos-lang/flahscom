"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

interface Vendor {
  id: number
  nombre: string
  identificacion: string | null
  activo: boolean | null
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [formData, setFormData] = useState({ nombre: "", identificacion: "", activo: true })
  const { toast } = useToast()

  const loadVendors = async () => {
    try {
      const res = await fetch("/api/vendors")
      const data = await res.json()
      setVendors(data.vendors || [])
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los vendedores", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVendors()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingVendor) {
        await fetch(`/api/vendors/${editingVendor.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
        toast({ title: "Éxito", description: "Vendedor actualizado correctamente" })
      } else {
        await fetch("/api/vendors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
        toast({ title: "Éxito", description: "Vendedor creado correctamente" })
      }
      setDialogOpen(false)
      setEditingVendor(null)
      setFormData({ nombre: "", identificacion: "", activo: true })
      loadVendors()
    } catch (error) {
      toast({ title: "Error", description: "No se pudo guardar el vendedor", variant: "destructive" })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este vendedor?")) return
    try {
      await fetch(`/api/vendors/${id}`, { method: "DELETE" })
      toast({ title: "Éxito", description: "Vendedor eliminado correctamente" })
      loadVendors()
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar el vendedor", variant: "destructive" })
    }
  }

  const openDialog = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor)
      setFormData({
        nombre: vendor.nombre,
        identificacion: vendor.identificacion || "",
        activo: vendor.activo ?? true,
      })
    } else {
      setEditingVendor(null)
      setFormData({ nombre: "", identificacion: "", activo: true })
    }
    setDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    )
  }

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto pb-24 md:pb-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Gestión de Vendedores</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              onClick={() => openDialog()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Vendedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingVendor ? "Editar Vendedor" : "Nuevo Vendedor"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="identificacion">Identificación</Label>
                <Input
                  id="identificacion"
                  value={formData.identificacion}
                  onChange={(e) => setFormData({ ...formData, identificacion: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="activo">Activo</Label>
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-orange-600">
                {editingVendor ? "Actualizar" : "Crear"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-orange-50 to-blue-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs md:text-sm font-semibold text-gray-700">ID</th>
                <th className="text-left px-4 py-3 text-xs md:text-sm font-semibold text-gray-700">Nombre</th>
                <th className="text-left px-4 py-3 text-xs md:text-sm font-semibold text-gray-700">Identificación</th>
                <th className="text-center px-4 py-3 text-xs md:text-sm font-semibold text-gray-700">Estado</th>
                <th className="text-center px-4 py-3 text-xs md:text-sm font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs md:text-sm text-gray-600">{vendor.id}</td>
                  <td className="px-4 py-3 text-xs md:text-sm font-medium text-gray-800">{vendor.nombre}</td>
                  <td className="px-4 py-3 text-xs md:text-sm text-gray-600">{vendor.identificacion || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block text-xs px-2 py-1 rounded-full ${vendor.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                    >
                      {vendor.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" variant="outline" onClick={() => openDialog(vendor)} className="h-7 px-2">
                        <Pencil className="w-3 h-3 md:mr-1" />
                        <span className="hidden md:inline">Editar</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(vendor.id)}
                        className="h-7 px-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {vendors.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">No hay vendedores registrados</div>
        )}
      </div>
    </div>
  )
}
