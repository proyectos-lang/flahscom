"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Shield, Save, ChevronDown } from "lucide-react"

interface PermisoWithName {
  id: number
  auth_user_id: string
  nombre: string
  dashboard: boolean
  dashboard_diario: boolean
  alertas: boolean
  ventas: boolean
  auditoria: boolean
  cartera: boolean
  cobros: boolean
  vendedores: boolean
  paquetes: boolean
  clientes: boolean
  mapa: boolean
  historial_pagos: boolean
  instalaciones: boolean
  historial_instalaciones: boolean
  call_center: boolean
  usuarios: boolean
  permisos: boolean
  programacion: boolean
  vista_tecnico: boolean
  rrhh: boolean
  gastos: boolean
  inventario: boolean
}

const modulos = [
  { key: "dashboard", label: "Dashboard" },
  { key: "dashboard_diario", label: "Dashboard Diario" },
  { key: "alertas", label: "Centro de Alertas" },
  { key: "ventas", label: "Ventas" },
  { key: "auditoria", label: "Auditoría" },
  { key: "cartera", label: "Cartera" },
  { key: "cobros", label: "Cobros" },
  { key: "vendedores", label: "Vendedores" },
  { key: "paquetes", label: "Paquetes" },
  { key: "clientes", label: "Clientes" },
  { key: "mapa", label: "Mapa" },
  { key: "historial_pagos", label: "Historial Pagos" },
  { key: "instalaciones", label: "Instalaciones" },
  { key: "historial_instalaciones", label: "Historial Instalaciones" },
  { key: "call_center", label: "Call Center" },
  { key: "programacion", label: "Programacion" },
  { key: "vista_tecnico", label: "Vista Tecnico" },
  { key: "usuarios", label: "Usuarios" },
  { key: "permisos", label: "Permisos" },
  { key: "rrhh", label: "RRHH" },
  { key: "gastos", label: "Gastos" },
  { key: "inventario", label: "Inventario (Bodega)" },
]

export default function PermisosPage() {
  const [permisos, setPermisos] = useState<PermisoWithName[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadPermisos()
  }, [])

  const loadPermisos = async () => {
    try {
      const res = await fetch("/api/permisos")
      const data = await res.json()
      setPermisos(data)
    } catch (error) {
      console.error("Error loading permisos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los permisos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePermiso = (permisoId: number, modulo: string, value: boolean) => {
    setPermisos((prev) => prev.map((p) => (p.id === permisoId ? { ...p, [modulo]: value } : p)))
  }

  const handleSavePermisos = async (permiso: PermisoWithName) => {
    setSaving(permiso.id)
    try {
      const res = await fetch(`/api/permisos/${permiso.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboard: permiso.dashboard,
          dashboard_diario: permiso.dashboard_diario,
          alertas: permiso.alertas,
          ventas: permiso.ventas,
          auditoria: permiso.auditoria,
          cartera: permiso.cartera,
          cobros: permiso.cobros,
          vendedores: permiso.vendedores,
          paquetes: permiso.paquetes,
          clientes: permiso.clientes,
          mapa: permiso.mapa,
          historial_pagos: permiso.historial_pagos,
          instalaciones: permiso.instalaciones,
          historial_instalaciones: permiso.historial_instalaciones,
          call_center: permiso.call_center,
          programacion: permiso.programacion,
          vista_tecnico: permiso.vista_tecnico,
          usuarios: permiso.usuarios,
          permisos: permiso.permisos,
          rrhh: permiso.rrhh,
          gastos: permiso.gastos,
          inventario: permiso.inventario,
        }),
      })

      if (!res.ok) throw new Error("Error al guardar")

      toast({
        title: "Permisos actualizados",
        description: `Los permisos de ${permiso.nombre} se guardaron correctamente`,
      })
    } catch (error) {
      console.error("Error saving permisos:", error)
      toast({
        title: "Error",
        description: "No se pudieron guardar los permisos",
        variant: "destructive",
      })
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando permisos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-orange-400 to-blue-500 rounded-lg">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Permisos</h1>
          <p className="text-sm text-gray-600">Administra el acceso de usuarios a módulos del sistema</p>
        </div>
      </div>

      {/* Permissions List */}
      <Accordion type="single" collapsible className="space-y-3">
        {permisos.map((permiso) => (
          <AccordionItem key={permiso.id} value={`permiso-${permiso.id}`} className="border-none">
            <Card className="border-2 border-gray-100 hover:border-orange-200 transition-colors overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50/50">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-orange-400 to-blue-500 rounded-lg">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-base text-gray-900">{permiso.nombre}</h3>
                      <p className="text-xs text-gray-500">ID: {permiso.auth_user_id.substring(0, 8)}...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 mr-2">
                      {Object.values(modulos).filter((m) => permiso[m.key as keyof PermisoWithName]).length} /{" "}
                      {modulos.length} módulos
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4 pt-4 border-t">
                  {/* Permissions Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {modulos.map((modulo) => (
                      <div key={modulo.key} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                        <Checkbox
                          id={`${permiso.id}-${modulo.key}`}
                          checked={permiso[modulo.key as keyof PermisoWithName] as boolean}
                          onCheckedChange={(checked) => handleTogglePermiso(permiso.id, modulo.key, checked as boolean)}
                          className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                        />
                        <label
                          htmlFor={`${permiso.id}-${modulo.key}`}
                          className="text-sm font-medium leading-none cursor-pointer select-none"
                        >
                          {modulo.label}
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={() => handleSavePermisos(permiso)}
                      disabled={saving === permiso.id}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving === permiso.id ? "Guardando..." : "Guardar Permisos"}
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
        ))}
      </Accordion>

      {permisos.length === 0 && (
        <div className="text-center py-12">
          <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay permisos configurados</p>
        </div>
      )}
    </div>
  )
}
