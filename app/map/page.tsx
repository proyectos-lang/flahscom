"use client"

import { useEffect, useState } from "react"
import { MapPin, Navigation } from "lucide-react"
import dynamic from "next/dynamic"
import type { Client } from "@/lib/db-types"

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/map/client-map"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-sm text-muted-foreground">Cargando mapa...</p>
      </div>
    </div>
  ),
})

export default function MapPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const response = await fetch("/api/clients")
      if (response.ok) {
        const data = await response.json()
        setClients(data)
      }
    } catch (error) {
      console.error("[v0] Error loading clients:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 md:space-y-4 p-3 md:p-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-3 md:p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 md:w-5 md:h-5" />
            <p className="text-[10px] md:text-xs font-medium opacity-90">Total Clientes</p>
          </div>
          <p className="text-xl md:text-2xl font-bold">{clients.length}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-3 md:p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Navigation className="w-4 h-4 md:w-5 md:h-5" />
            <p className="text-[10px] md:text-xs font-medium opacity-90">Con Ubicación</p>
          </div>
          <p className="text-xl md:text-2xl font-bold">{clients.filter((c) => c.latitude && c.longitude).length}</p>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        <div className="p-3 md:p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-blue-50">
          <h2 className="text-sm md:text-base font-semibold text-gray-800">Mapa de Clientes</h2>
          <p className="text-[10px] md:text-xs text-gray-600 mt-0.5">Visualiza la ubicación de todos los clientes</p>
        </div>
        <div className="h-[calc(100vh-16rem)] md:h-[600px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Cargando clientes...</p>
              </div>
            </div>
          ) : (
            <MapComponent clients={clients} />
          )}
        </div>
      </div>
    </div>
  )
}
