"use client"

import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut } from "lucide-react"
import { useState, useEffect } from "react"
import { RrhhNotifications } from "@/components/rrhh/rrhh-notifications"

export function MobileHeader() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState<string>("")

  useEffect(() => {
    const updateTime = () => {
      const hondurasTime = new Date().toLocaleString("es-HN", {
        timeZone: "America/Tegucigalpa",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      setCurrentTime(hondurasTime)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <header className="bg-gradient-to-r from-orange-50 via-white to-blue-50 border-b border-gray-200/50 backdrop-blur-lg fixed top-0 left-0 right-0 z-50 md:hidden shadow-sm">
      <div className="flex items-center justify-between h-14 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="relative w-8 h-8">
            <Image src="/flashcom-logo.png" alt="Flashcom" fill className="object-contain" priority />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm bg-gradient-to-r from-orange-600 to-orange-600 bg-clip-text text-transparent">
              Flashcom Honduras
            </span>
            <span className="text-[8px] text-gray-500 -mt-0.5">Tu señal de confianza</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <RrhhNotifications />

          <span className="text-xs font-semibold text-gray-600">{currentTime}</span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100/50">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-blue-500 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-xs font-bold text-white">{user?.full_name.charAt(0).toUpperCase()}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <span className="text-sm font-semibold">{user?.full_name}</span>
                  <span className="text-xs text-gray-500">{user?.email}</span>
                  <span className="text-xs bg-gradient-to-r from-orange-500 to-blue-500 bg-clip-text text-transparent font-semibold capitalize mt-1">
                    {user?.role}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
