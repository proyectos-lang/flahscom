"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import {
  Home,
  ShoppingCart,
  ClipboardCheck,
  Wallet,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Users,
  Package,
  MapPin,
  FileText,
  Wrench,
  UserCog,
  Shield,
  Calendar,
  CalendarCheck,
  HardHat,
  Phone,
  Building2,
  Bell,
  Receipt,
  Warehouse,
  Share2,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { createContext, useContext, useRef, useState, type ReactNode } from "react"

const SidebarContext = createContext<{
  isExpanded: boolean
  setIsExpanded: (value: boolean) => void
}>({
  isExpanded: true,
  setIsExpanded: () => {},
})

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true)

  return <SidebarContext.Provider value={{ isExpanded, setIsExpanded }}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  return useContext(SidebarContext)
}

export function SidebarNavigation() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { isExpanded, setIsExpanded } = useSidebar()
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [portalUrl, setPortalUrl] = useState("")
  const linkInputRef = useRef<HTMLInputElement>(null)

  // Opens a dialog showing the public customer-portal link. Clipboard/Web Share
  // APIs are blocked inside preview iframes, so we always show the link in a
  // selectable field with a manual copy fallback that works everywhere.
  const compartirLinkCliente = () => {
    const url = `${window.location.origin}/portal`
    setPortalUrl(url)
    setLinkCopiado(false)
    setShowLinkDialog(true)
  }

  const copiarPortalUrl = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(portalUrl)
        setLinkCopiado(true)
        setTimeout(() => setLinkCopiado(false), 2500)
        return
      }
      throw new Error("clipboard-api-unavailable")
    } catch {
      // Legacy fallback for restricted contexts (e.g. preview iframes).
      const input = linkInputRef.current
      if (input) {
        input.focus()
        input.select()
        try {
          document.execCommand("copy")
          setLinkCopiado(true)
          setTimeout(() => setLinkCopiado(false), 2500)
        } catch (err) {
          console.log("[v0] Copia manual requerida:", err)
        }
      }
    }
  }

  const getNavLinks = () => {
    const permissions = user?.permissions

    const links = []

    if (permissions?.dashboard) {
      links.push({
        href: "/dashboard",
        label: "Inicio",
        icon: Home,
      })
    }

    if (permissions?.dashboard_diario) {
      links.push({
        href: "/daily-dashboard",
        label: "Dashboard Diario",
        icon: Calendar,
      })
    }

    if (permissions?.alertas) {
      links.push({
        href: "/alertas",
        label: "Centro de Alertas",
        icon: Bell,
      })
    }

    if (permissions?.ventas) {
      links.push({ href: "/sales", label: "Ventas", icon: ShoppingCart })
    }

    if (permissions?.auditoria) {
      links.push({ href: "/audit", label: "Auditoría", icon: ClipboardCheck })
    }

    if (permissions?.cartera) {
      links.push({ href: "/portfolio", label: "Cartera", icon: Wallet })
    }

    if (permissions?.cobros) {
      links.push({ href: "/payments", label: "Cobros", icon: DollarSign })
    }

    if (permissions?.historial_pagos) {
      links.push({ href: "/payment-history", label: "Historial", icon: FileText })
    }

    if (permissions?.vendedores) {
      links.push({ href: "/vendors", label: "Vendedores", icon: Users })
    }

    if (permissions?.paquetes) {
      links.push({ href: "/packages", label: "Paquetes", icon: Package })
    }

    if (permissions?.clientes) {
      links.push({ href: "/clientes", label: "Clientes", icon: Users })
    }

    if (permissions?.mapa) {
      links.push({ href: "/map", label: "Mapa", icon: MapPin })
    }

    if (permissions?.usuarios) {
      links.push({ href: "/usuarios", label: "Usuarios", icon: UserCog })
    }

    if (permissions?.historial_instalaciones) {
      links.push({ href: "/historial-instalaciones", label: "Hist. Instalaciones", icon: Wrench })
    }

    if (permissions?.call_center) {
      links.push({ href: "/call-center", label: "Call Center", icon: Phone })
    }

    if (permissions?.programacion) {
      links.push({ href: "/cuadrillas", label: "Cuadrillas", icon: Users })
      links.push({ href: "/programacion", label: "Programacion", icon: CalendarCheck })
    }

    if (permissions?.vista_tecnico) {
      links.push({ href: "/tecnico", label: "Tecnico", icon: HardHat })
    }

    if (permissions?.permisos) {
      links.push({ href: "/permisos", label: "Permisos", icon: Shield })
    }

    if (permissions?.rrhh) {
      links.push({ href: "/rrhh", label: "RRHH", icon: Building2 })
    }

    if (permissions?.gastos) {
      links.push({ href: "/gastos", label: "Gastos", icon: Receipt })
    }

    if (permissions?.inventario) {
      links.push({ href: "/inventario", label: "Inventario", icon: Warehouse })
    }

    return links
  }

  const isActiveLink = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/"
    }
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={`hidden md:flex flex-col bg-gradient-to-b from-white via-orange-50/30 to-blue-50/30 border-r border-gray-200/50 transition-all duration-300 fixed left-0 bottom-0 z-50 shadow-sm ${
        isExpanded ? "w-64" : "w-20"
      }`}
      style={{ top: "64px" }}
    >
      {/* Toggle Button */}
      <div className="flex justify-end p-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-full hover:bg-orange-100/50 transition-all h-8 w-8"
        >
          {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {getNavLinks().map((link) => {
          const Icon = link.icon
          const isActive = isActiveLink(link.href)

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${
                isActive
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md"
                  : "text-gray-700 hover:bg-gray-100/80"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-gray-600"}`} />
              {isExpanded && (
                <span className="text-xs font-medium truncate transition-opacity duration-200">{link.label}</span>
              )}
            </Link>
          )
        })}

        {/* Compartir link del portal de clientes (debajo del módulo Inventario) */}
        <button
          type="button"
          onClick={compartirLinkCliente}
          title="Compartir link del portal de clientes"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-orange-700 hover:bg-orange-100/70 border border-dashed border-orange-300"
        >
          <Share2 className="w-4 h-4 flex-shrink-0 text-orange-600" />
          {isExpanded && (
            <span className="text-xs font-medium truncate">Compartir link cliente</span>
          )}
        </button>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200/50">
        {isExpanded ? (
          <div className="text-center text-xs text-gray-500">
            <p className="font-semibold bg-gradient-to-r from-orange-600 to-blue-600 bg-clip-text text-transparent">
              Flashcom Honduras
            </p>
            <p className="mt-1">Sistema de Gestión v1.0</p>
          </div>
        ) : (
          <div className="w-8 h-8 mx-auto bg-gradient-to-br from-orange-400 to-blue-500 rounded-full flex items-center justify-center shadow-md">
            <span className="text-xs font-bold text-white">F</span>
          </div>
        )}
      </div>

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link del portal de clientes</DialogTitle>
            <DialogDescription>
              Comparte este enlace con tus clientes. Ingresan usando su número de cédula tanto en
              usuario como en contraseña.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              ref={linkInputRef}
              readOnly
              value={portalUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 text-sm"
            />
            <Button
              type="button"
              onClick={copiarPortalUrl}
              className="bg-orange-600 hover:bg-orange-700 text-white shrink-0"
            >
              {linkCopiado ? (
                <>
                  <Check className="w-4 h-4 mr-1" /> Copiado
                </>
              ) : (
                "Copiar"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  )
}

export function SidebarContent({ children }: { children: ReactNode }) {
  const { isExpanded } = useSidebar()

  return (
    <div
      className={`flex-1 transition-all duration-300 ease-in-out overflow-hidden ${
        isExpanded ? "md:ml-64" : "md:ml-20"
      }`}
    >
      {children}
    </div>
  )
}
