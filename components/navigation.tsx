"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import Image from "next/image"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { RrhhNotifications } from "@/components/rrhh/rrhh-notifications"

export function Navigation() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState<string>("")

  useEffect(() => {
    const updateTime = () => {
      const hondurasTime = new Date().toLocaleString("es-HN", {
        timeZone: "America/Tegucigalpa",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
      setCurrentTime(hondurasTime)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  return (
    <nav className="bg-gradient-to-r from-orange-50 via-white to-blue-50 border-b border-gray-200/50 backdrop-blur-lg fixed top-0 left-0 right-0 z-60 hidden md:block shadow-sm">
      <div className="max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 transition-transform group-hover:scale-105">
                <Image src="/flashcom-logo.png" alt="Flashcom" fill className="object-contain" priority />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg bg-gradient-to-r from-orange-600 to-orange-600 bg-clip-text text-transparent">
                  Flashcom Honduras
                </span>
                <span className="text-[10px] text-gray-500 -mt-1">Tu señal de confianza</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <RrhhNotifications />

            <div className="flex flex-col items-end">
              <span className="text-xs font-medium text-gray-600">Honduras</span>
              <span className="text-sm font-semibold bg-gradient-to-r from-orange-600 to-blue-600 bg-clip-text text-transparent">
                {currentTime}
              </span>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-white/50 rounded-full border border-gray-200/50">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-blue-500 rounded-full flex items-center justify-center shadow-md">
                <span className="text-xs font-bold text-white">{user?.full_name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800">{user?.full_name}</span>
                <span className="text-xs text-gray-500 capitalize">{user?.role}</span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
