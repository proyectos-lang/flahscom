"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Users, 
  Clock, 
  Calendar, 
  Award, 
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Building2,
  AlertTriangle,
  Package,
  Banknote,
  MinusCircle,
  Calculator,
  Wallet,
} from "lucide-react"
import { cn } from "@/lib/utils"

const sidebarItems = [
  { 
    name: "Dashboard", 
    href: "/rrhh", 
    icon: LayoutDashboard,
    description: "Resumen general"
  },
  { 
    name: "Empleados", 
    href: "/rrhh/empleados", 
    icon: Users,
    description: "Directorio de personal"
  },
  { 
    name: "Asistencia", 
    href: "/rrhh/asistencia", 
    icon: Clock,
    description: "Control de tiempo"
  },
  { 
    name: "Vacaciones", 
    href: "/rrhh/vacaciones", 
    icon: Calendar,
    description: "Permisos y ausencias"
  },
  { 
    name: "Evaluaciones", 
    href: "/rrhh/evaluaciones", 
    icon: Award,
    description: "Desempeno laboral"
  },
  { 
    name: "Procesos", 
    href: "/rrhh/procesos", 
    icon: AlertTriangle,
    description: "Disciplina y sanciones"
  },
  { 
    name: "Dotaciones", 
    href: "/rrhh/dotaciones", 
    icon: Package,
    description: "Uniformes y equipos"
  },
  { 
    name: "Adelantos", 
    href: "/rrhh/adelantos", 
    icon: Banknote,
    description: "Solicitudes de adelanto"
  },
  { 
    name: "Deducciones", 
    href: "/rrhh/deducciones", 
    icon: MinusCircle,
    description: "Descuentos de nomina"
  },
  { 
    name: "Liquidacion", 
    href: "/rrhh/liquidacion", 
    icon: Calculator,
    description: "Planilla de pago"
  },
  {
    name: "Prestaciones",
    href: "/rrhh/prestaciones",
    icon: Wallet,
    description: "Ex empleados"
  },
]

export default function RRHHLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside 
        className={cn(
          "flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo/Header */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-gray-900 text-sm truncate">FLASHCOM / SIDH</h1>
              <p className="text-[10px] text-gray-500 truncate">Recursos Humanos</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/rrhh" && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative",
                  isActive 
                    ? "bg-orange-50 text-orange-600" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive ? "text-orange-500" : "text-gray-400 group-hover:text-gray-600"
                )} />
                {!collapsed && (
                  <div className="overflow-hidden">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isActive ? "text-orange-600" : ""
                    )}>
                      {item.name}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">{item.description}</p>
                  </div>
                )}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-orange-500 rounded-r-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="p-2 border-t border-gray-100">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-xs">Colapsar</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
