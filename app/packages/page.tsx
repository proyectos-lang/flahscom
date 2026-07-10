"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

interface Package {
  id: number
  nombre: string
  velocidad: string | null
  tecnologia: string | null
  precio_mensual: number
  activo: boolean | null
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [formData, setFormData] = useState({
    nombre: "",
    velocidad: "",
    tecnologia: "",
    precio_mensual: "",
    activo: true,
  })
  const { toast } = useToast()

  const loadPackages = async () => {
    try {
      const res = await fetch("/api/packages")
      const data = await res.json()
      setPackages(data.packages || [])
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los paquetes", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPackages()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        precio_mensual: Number.parseFloat(formData.precio_mensual),
      }

      if (editingPackage) {
        await fetch(`/api/packages/${editingPackage.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        toast({ title: "Éxito", description: "Paquete actualizado correctamente" })
      } else {
        await fetch("/api/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        toast({ title: "Éxito", description: "Paquete creado correctamente" })
      }
      setDialogOpen(false)
      setEditingPackage(null)
      setFormData({ nombre: "", velocidad: "", tecnologia: "", precio_mensual: "", activo: true })
      loadPackages()
    } catch (error) {
      toast({ title: "Error", description: "No se pudo guardar el paquete", variant: "destructive" })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este paquete?")) return
    try {
      await fetch(`/api/packages/${id}`, { method: "DELETE" })
      toast({ title: "Éxito", description: "Paquete eliminado correctamente" })
      loadPackages()
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar el paquete", variant: "destructive" })
    }
  }

  const openDialog = (pkg?: Package) => {
    if (pkg) {
      setEditingPackage(pkg)
      setFormData({
        nombre: pkg.nombre,
        velocidad: pkg.velocidad || "",
        tecnologia: pkg.tecnologia || "",
        precio_mensual: pkg.precio_mensual.toString(),
        activo: pkg.activo ?? true,
      })
    } else {
      setEditingPackage(null)
      setFormData({ nombre: "", velocidad: "", tecnologia: "", precio_mensual: "", activo: true })
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
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Gestión de Paquetes</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              onClick={() => openDialog()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Paquete
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPackage ? "Editar Paquete" : "Nuevo Paquete"}</DialogTitle>
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
                <Label htmlFor="velocidad">Velocidad</Label>
                <Input
                  id="velocidad"
                  value={formData.velocidad}
                  onChange={(e) => setFormData({ ...formData, velocidad: e.target.value })}
                  placeholder="Ej: 100 Mbps"
                />
              </div>
              <div>
                <Label htmlFor="tecnologia">Tecnología</Label>
                <Input
                  id="tecnologia"
                  value={formData.tecnologia}
                  onChange={(e) => setFormData({ ...formData, tecnologia: e.target.value })}
                  placeholder="Ej: Fibra Óptica"
                />
              </div>
              <div>
                <Label htmlFor="precio">Precio Mensual (L) *</Label>
                <Input
                  id="precio"
                  type="number"
                  step="0.01"
                  value={formData.precio_mensual}
                  onChange={(e) => setFormData({ ...formData, precio_mensual: e.target.value })}
                  required
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
              <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-blue-600">
                {editingPackage ? "Actualizar" : "Crear"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <Card key={pkg.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{pkg.nombre}</h3>
                  {pkg.velocidad && <p className="text-sm text-gray-600">{pkg.velocidad}</p>}
                  {pkg.tecnologia && <p className="text-xs text-gray-500">{pkg.tecnologia}</p>}
                  <p className="text-lg font-bold text-orange-600 mt-2">L{pkg.precio_mensual.toFixed(2)}/mes</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${pkg.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                >
                  {pkg.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => openDialog(pkg)} className="flex-1">
                  <Pencil className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(pkg.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
