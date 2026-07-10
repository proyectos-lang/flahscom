"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { UserPlus, Trash2, Users, Eye, EyeOff } from "lucide-react"
import type { Perfil } from "@/lib/db-types"

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Perfil[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    nombre: "",
    rol: "vendedor" as "vendedor" | "administrador",
  })
  const { toast } = useToast()

  useEffect(() => {
    loadUsuarios()
  }, [])

  const loadUsuarios = async () => {
    try {
      const response = await fetch("/api/usuarios")
      const data = await response.json()
      setUsuarios(data)
    } catch (error) {
      console.error("Error loading usuarios:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Las contraseñas no coinciden. Por favor verifica.")
      toast({
        title: "Error de validación",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      })
      return
    }

    setPasswordError("")
    setLoading(true)

    console.log("[v0] Creating user:", formData)

    try {
      const response = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      console.log("[v0] Response status:", response.status)

      const data = await response.json()
      console.log("[v0] Response data:", data)

      if (!response.ok) {
        throw new Error(data.error || "Error al crear usuario")
      }

      toast({
        title: "Usuario creado",
        description: `Usuario ${data.email} creado exitosamente`,
      })

      setIsDialogOpen(false)
      setFormData({
        username: "",
        password: "",
        confirmPassword: "",
        nombre: "",
        rol: "vendedor",
      })
      setShowPassword(false)
      setShowConfirmPassword(false)
      setPasswordError("")
      loadUsuarios()
    } catch (error: any) {
      console.error("[v0] Error creating user:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return

    try {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Error al eliminar usuario")
      }

      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado exitosamente",
      })

      loadUsuarios()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getRolBadge = (rol: string) => {
    const styles = {
      vendedor: "bg-blue-100 text-blue-700",
      administrador: "bg-orange-100 text-orange-700",
    }
    return styles[rol as keyof typeof styles] || "bg-gray-100 text-gray-700"
  }

  if (loading && usuarios.length === 0) {
    return <div className="p-4">Cargando...</div>
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-blue-600 bg-clip-text text-transparent">
            Gestión de Usuarios
          </h1>
          <p className="text-sm text-gray-500">Administra los usuarios del sistema</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>Ingresa los datos del nuevo usuario.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Ej: juan.perez"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value })
                      if (passwordError) setPasswordError("")
                    }}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, confirmPassword: e.target.value })
                      if (passwordError) setPasswordError("")
                    }}
                    required
                    minLength={6}
                    className={`pr-10 ${passwordError ? "border-red-500" : ""}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
                {passwordError && <p className="text-xs text-red-500 mt-1">{passwordError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre Completo</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rol">Rol</Label>
                <Select
                  value={formData.rol}
                  onValueChange={(value) => setFormData({ ...formData, rol: value as "vendedor" | "administrador" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="administrador">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creando..." : "Crear Usuario"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            <CardTitle className="text-lg">Lista de Usuarios</CardTitle>
          </div>
          <CardDescription>Total de usuarios: {usuarios.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 px-3 font-semibold text-gray-700">ID</th>
                  <th className="py-2 px-3 font-semibold text-gray-700">Nombre</th>
                  <th className="py-2 px-3 font-semibold text-gray-700">Rol</th>
                  <th className="py-2 px-3 font-semibold text-gray-700">Fecha Creación</th>
                  <th className="py-2 px-3 font-semibold text-gray-700 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-600">{usuario.id}</td>
                    <td className="py-2 px-3 font-medium">{usuario.nombre}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRolBadge(
                          usuario.rol,
                        )}`}
                      >
                        {usuario.rol}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-600">{new Date(usuario.created_at).toLocaleDateString()}</td>
                    <td className="py-2 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(usuario.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
