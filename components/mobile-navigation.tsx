"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  ShoppingCart,
  FileCheck,
  Wallet,
  DollarSign,
  Users,
  Package,
  MapPin,
  FileText,
  Wrench,
  UserCog,
  Shield,
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
import { useAuth } from "@/lib/auth-context"
import { useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function MobileNavigation() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [portalUrl, setPortalUrl] = useState("")
  const [linkCopiado, setLinkCopiado] = useState(false)
  const linkInputRef = useRef<HTMLInputElement>(null)

  // Clipboard/Web Share APIs are blocked in preview iframes, so we show the
  // link in a dialog with a manual copy fallback that works everywhere.
  const compartirLinkCliente = () => {
    setPortalUrl(`${window.location.origin}/portal`)
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

  const getNavItems = () => {
    const permissions = user?.permissions

    const items = []

    // Dashboard
    if (permissions?.dashboard) {
      items.push({
        href: "/dashboard",
        label: "Inicio",
        icon: Home,
      })
    }

    // Centro de Alertas
    if (permissions?.alertas) {
      items.push({
        href: "/alertas",
        label: "Alertas",
        icon: Bell,
      })
    }

    // Ventas
    if (permissions?.ventas) {
      items.push({
        href: "/sales",
        label: "Ventas",
        icon: ShoppingCart,
      })
    }

    // Auditoría
    if (permissions?.auditoria) {
      items.push({
        href: "/audit",
        label: "Auditoría",
        icon: FileCheck,
      })
    }

    // Cartera
    if (permissions?.cartera) {
      items.push({
        href: "/portfolio",
        label: "Cartera",
        icon: Wallet,
      })
    }

    // Cobros
    if (permissions?.cobros) {
      items.push({
        href: "/payments",
        label: "Cobros",
        icon: DollarSign,
      })
    }

    // Historial de Pagos
    if (permissions?.historial_pagos) {
      items.push({
        href: "/payment-history",
        label: "Historial",
        icon: FileText,
      })
    }

    // Vendedores
    if (permissions?.vendedores) {
      items.push({
        href: "/vendors",
        label: "Vendedores",
        icon: Users,
      })
    }

    // Paquetes
    if (permissions?.paquetes) {
      items.push({
        href: "/packages",
        label: "Paquetes",
        icon: Package,
      })
    }

    // Mapa
    if (permissions?.mapa) {
      items.push({
        href: "/map",
        label: "Mapa",
        icon: MapPin,
      })
    }

    // Usuarios
    if (permissions?.usuarios) {
      items.push({
        href: "/usuarios",
        label: "Usuarios",
        icon: UserCog,
      })
    }

    // Historial Instalaciones
    if (permissions?.historial_instalaciones) {
      items.push({
        href: "/historial-instalaciones",
        label: "Historial Inst.",
        icon: Wrench,
      })
    }

    // Call Center
    if (permissions?.call_center) {
      items.push({
        href: "/call-center",
        label: "Call Center",
        icon: Phone,
      })
    }

    // Cuadrillas
    if (permissions?.programacion) {
      items.push({
        href: "/cuadrillas",
        label: "Cuadrillas",
        icon: Users,
      })
    }

    // Programacion
    if (permissions?.programacion) {
      items.push({
        href: "/programacion",
        label: "Programar",
        icon: CalendarCheck,
      })
    }

    // Tecnico
    if (permissions?.vista_tecnico) {
      items.push({
        href: "/tecnico",
        label: "Tecnico",
        icon: HardHat,
      })
    }

    // Permisos
    if (permissions?.permisos) {
      items.push({
        href: "/permisos",
        label: "Permisos",
        icon: Shield,
      })
    }

    // RRHH
    if (permissions?.rrhh) {
      items.push({
        href: "/rrhh",
        label: "RRHH",
        icon: Building2,
      })
    }

    // Gastos
    if (permissions?.gastos) {
      items.push({
        href: "/gastos",
        label: "Gastos",
        icon: Receipt,
      })
    }

    // Inventario (Bodega)
    if (permissions?.inventario) {
      items.push({
        href: "/inventario",
        label: "Inventario",
        icon: Warehouse,
      })
    }

    return items
  }

  const navItems = getNavItems()

  return (
    <>
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200/50 md:hidden z-50 safe-area-inset-bottom shadow-lg overflow-x-auto">
      <div className="flex items-center h-16 px-2 min-w-max">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[70px] h-full gap-1 transition-all rounded-lg mx-1 ${
                isActive
                  ? "bg-gradient-to-br from-orange-500 to-blue-500 text-white scale-95"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className={`${isActive ? "w-5 h-5" : "w-4 h-4"}`} />
              <span className={`text-[9px] font-medium whitespace-nowrap ${isActive ? "font-bold" : ""}`}>
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* Compartir link del portal de clientes (después del módulo Inventario) */}
        <button
          type="button"
          onClick={compartirLinkCliente}
          className="flex flex-col items-center justify-center min-w-[70px] h-full gap-1 transition-all rounded-lg mx-1 text-orange-600 hover:bg-orange-50"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-[9px] font-medium whitespace-nowrap">Link Cliente</span>
        </button>
      </div>
    </nav>

    <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
      <DialogContent className="max-w-[92vw] sm:max-w-md">
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
    </>
  )
}
