"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CalendarClock, Wallet } from "lucide-react"

interface PendienteVacacion {
  id: number
  empleado_id: number
  fecha_inicio: string
  fecha_fin: string
  dias_solicitados: number
  estado: string
}

interface PendienteAdelanto {
  id: number
  empleado_id: number
  monto: number
  periodo_descuento: string | null
  estado: string
}

interface Empleado {
  id: number
  nombre_completo: string
}

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "-"
  try {
    const d = new Date(dateStr + (dateStr.length === 10 ? "T00:00:00" : ""))
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("es-HN", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return dateStr
  }
}

const formatLempiras = (n: number) =>
  `L. ${Number(n || 0).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function RrhhNotifications() {
  const { user } = useAuth()
  const tieneAcceso = !!user?.permissions?.rrhh

  const [vacaciones, setVacaciones] = useState<PendienteVacacion[]>([])
  const [adelantos, setAdelantos] = useState<PendienteAdelanto[]>([])
  const [empleados, setEmpleados] = useState<Record<number, string>>({})

  const cargarPendientes = useCallback(async () => {
    if (!tieneAcceso) return
    try {
      // Vacaciones returns ALL requests, so we filter to the pending ones
      // client-side. Adelantos supports a server-side estado filter.
      const [vacRes, adelRes, empRes] = await Promise.all([
        fetch("/api/rrhh/vacaciones").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/rrhh/adelantos?estado=pendiente").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/rrhh/empleados").then((r) => r.json()).catch(() => ({ data: [] })),
      ])

      const vacList: PendienteVacacion[] = (vacRes.data || []).filter(
        (v: PendienteVacacion) => v.estado === "pendiente",
      )
      const adelList: PendienteAdelanto[] = adelRes.data || []

      const empMap: Record<number, string> = {}
      for (const e of (empRes.data || []) as Empleado[]) {
        empMap[e.id] = e.nombre_completo
      }

      console.log(
        "[v0] RRHH notifications - acceso:",
        tieneAcceso,
        "vacaciones pendientes:",
        vacList.length,
        "adelantos pendientes:",
        adelList.length,
      )

      setVacaciones(vacList)
      setAdelantos(adelList)
      setEmpleados(empMap)
    } catch (error) {
      console.error("[v0] Error cargando notificaciones RRHH:", error)
    }
  }, [tieneAcceso])

  useEffect(() => {
    if (!tieneAcceso) return
    cargarPendientes()
    // Light polling so the badges stay reasonably fresh without a websocket.
    const interval = setInterval(cargarPendientes, 60000)
    return () => clearInterval(interval)
  }, [tieneAcceso, cargarPendientes])

  if (!tieneAcceso) return null

  const nombreEmpleado = (id: number) => empleados[id] || `Empleado #${id}`

  return (
    <div className="flex items-center gap-1.5">
      {/* Vacaciones pendientes — blue bubble */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full border transition-colors ${
              vacaciones.length > 0
                ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700 shadow-md"
                : "bg-white/60 border-blue-200/70 text-blue-600 hover:bg-blue-50"
            }`}
            aria-label={`Vacaciones pendientes: ${vacaciones.length}`}
          >
            <CalendarClock className="h-[18px] w-[18px]" />
            {vacaciones.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center">
                {/* Blinking ring to draw attention to a pending request */}
                <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping" />
                <span className="relative inline-flex min-w-[20px] h-5 px-1 items-center justify-center rounded-full bg-blue-600 ring-2 ring-white text-white text-[10px] font-bold">
                  {vacaciones.length > 99 ? "99+" : vacaciones.length}
                </span>
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-blue-50/50">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-800">Vacaciones pendientes</span>
            </div>
            <span className="text-xs font-bold text-blue-600">{vacaciones.length}</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {vacaciones.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No hay solicitudes pendientes
              </div>
            ) : (
              vacaciones.map((v) => (
                <div key={v.id} className="px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <p className="text-sm font-medium text-gray-800 truncate">{nombreEmpleado(v.empleado_id)}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(v.fecha_inicio)} &rarr; {formatDate(v.fecha_fin)} &middot;{" "}
                    {v.dias_solicitados} dia{v.dias_solicitados === 1 ? "" : "s"}
                  </p>
                </div>
              ))
            )}
          </div>
          <Link
            href="/rrhh/vacaciones"
            className="block px-4 py-3 text-center text-sm font-medium text-blue-600 border-t border-gray-100 hover:bg-blue-50"
          >
            Gestionar solicitudes
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Adelantos pendientes — amber bubble */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full border transition-colors ${
              adelantos.length > 0
                ? "bg-amber-500 border-amber-500 text-white hover:bg-amber-600 shadow-md"
                : "bg-white/60 border-amber-200/70 text-amber-600 hover:bg-amber-50"
            }`}
            aria-label={`Adelantos pendientes: ${adelantos.length}`}
          >
            <Wallet className="h-[18px] w-[18px]" />
            {adelantos.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center">
                {/* Blinking ring to draw attention to a pending request */}
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                <span className="relative inline-flex min-w-[20px] h-5 px-1 items-center justify-center rounded-full bg-amber-500 ring-2 ring-white text-white text-[10px] font-bold">
                  {adelantos.length > 99 ? "99+" : adelantos.length}
                </span>
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-amber-50/50">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-gray-800">Adelantos pendientes</span>
            </div>
            <span className="text-xs font-bold text-amber-600">{adelantos.length}</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {adelantos.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No hay solicitudes pendientes
              </div>
            ) : (
              adelantos.map((a) => (
                <div key={a.id} className="px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">{nombreEmpleado(a.empleado_id)}</p>
                    <span className="text-sm font-semibold text-amber-600 whitespace-nowrap">
                      {formatLempiras(a.monto)}
                    </span>
                  </div>
                  {a.periodo_descuento && (
                    <p className="text-xs text-gray-500">Descuento: {formatDate(a.periodo_descuento)}</p>
                  )}
                </div>
              ))
            )}
          </div>
          <Link
            href="/rrhh/adelantos"
            className="block px-4 py-3 text-center text-sm font-medium text-amber-600 border-t border-gray-100 hover:bg-amber-50"
          >
            Ir a Aprobaciones
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
