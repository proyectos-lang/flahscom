"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, 
  Clock, 
  DollarSign, 
  Calendar, 
  TrendingUp,
  UserCheck,
  UserX,
  AlertCircle,
  Activity,
  Loader2
} from "lucide-react"

interface DashboardStats {
  totalEmpleados: number
  empleadosActivos: number
  empleadosInactivos: number
  asistenciasHoy: number
  ausenciasHoy: number
  vacacionesActivas: number
  nominaMensual: number
  evaluacionesPendientes: number
}

interface ActividadReciente {
  tipo: "ingreso" | "asistencia" | "vacacion" | "evaluacion" | "nomina"
  descripcion: string
  fecha: string
  empleado: string
}

export default function RRHHDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalEmpleados: 0,
    empleadosActivos: 0,
    empleadosInactivos: 0,
    asistenciasHoy: 0,
    ausenciasHoy: 0,
    vacacionesActivas: 0,
    nominaMensual: 0,
    evaluacionesPendientes: 0,
  })
  const [actividad, setActividad] = useState<ActividadReciente[]>([])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/rrhh/dashboard")
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
        setActividad(data.actividad || [])
      }
    } catch (error) {
      console.error("Error loading dashboard:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const statCards = [
    {
      title: "Total Empleados",
      value: stats.totalEmpleados,
      icon: Users,
      color: "from-blue-500 to-blue-600",
      subtitle: `${stats.empleadosActivos} activos`,
    },
    {
      title: "Asistencia Hoy",
      value: stats.asistenciasHoy,
      icon: UserCheck,
      color: "from-green-500 to-green-600",
      subtitle: `${stats.ausenciasHoy} ausencias`,
    },
    {
      title: "Vacaciones Activas",
      value: stats.vacacionesActivas,
      icon: Calendar,
      color: "from-amber-500 to-amber-600",
      subtitle: "empleados de permiso",
    },
    {
      title: "Nomina Mensual",
      value: `L${stats.nominaMensual.toLocaleString()}`,
      icon: DollarSign,
      color: "from-purple-500 to-purple-600",
      subtitle: "presupuesto actual",
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Recursos Humanos</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen general del personal de FLASHCOM y SIDH</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <Card key={idx} className="overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${stat.color}`} />
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{stat.subtitle}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.empleadosInactivos}</p>
                <p className="text-xs text-gray-500">Empleados Inactivos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.evaluacionesPendientes}</p>
                <p className="text-xs text-gray-500">Evaluaciones Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalEmpleados > 0 
                    ? Math.round((stats.asistenciasHoy / stats.empleadosActivos) * 100) 
                    : 0}%
                </p>
                <p className="text-xs text-gray-500">Tasa de Asistencia Hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-500" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {actividad.length > 0 ? (
              actividad.slice(0, 8).map((act, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    act.tipo === "ingreso" ? "bg-blue-100" :
                    act.tipo === "asistencia" ? "bg-green-100" :
                    act.tipo === "vacacion" ? "bg-amber-100" :
                    act.tipo === "evaluacion" ? "bg-purple-100" :
                    "bg-gray-100"
                  }`}>
                    {act.tipo === "ingreso" && <Users className="w-4 h-4 text-blue-600" />}
                    {act.tipo === "asistencia" && <Clock className="w-4 h-4 text-green-600" />}
                    {act.tipo === "vacacion" && <Calendar className="w-4 h-4 text-amber-600" />}
                    {act.tipo === "evaluacion" && <TrendingUp className="w-4 h-4 text-purple-600" />}
                    {act.tipo === "nomina" && <DollarSign className="w-4 h-4 text-gray-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{act.descripcion}</p>
                    <p className="text-xs text-gray-500">{act.empleado}</p>
                  </div>
                  <p className="text-xs text-gray-400">{act.fecha}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 py-8 text-sm">No hay actividad reciente</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
