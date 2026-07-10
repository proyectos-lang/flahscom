"use client"

import { useState, useEffect } from "react"
import type { Client } from "@/lib/db-types"
import { MapPin, Navigation } from "lucide-react"

interface ClientMapProps {
  clients: Client[]
}

export default function ClientMap({ clients }: ClientMapProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [mapCenter, setMapCenter] = useState({ lat: 14.065, lng: -87.1715, zoom: 12 })

  // Filter clients with valid coordinates
  const validClients = clients.filter((client) => client.latitud && client.longitud)

  // Calculate initial center
  useEffect(() => {
    if (validClients.length > 0) {
      const centerLat = validClients.reduce((sum, c) => sum + c.latitud!, 0) / validClients.length
      const centerLng = validClients.reduce((sum, c) => sum + c.longitud!, 0) / validClients.length
      setMapCenter({ lat: centerLat, lng: centerLng, zoom: 12 })
    }
  }, [validClients.length])

  const handleClientClick = (client: Client) => {
    setSelectedClient(client)
    if (client.latitud && client.longitud) {
      setMapCenter({ lat: client.latitud, lng: client.longitud, zoom: 16 })
    }
  }

  // Generate OpenStreetMap URL with markers
  const generateMapUrl = () => {
    const { lat, lng, zoom } = mapCenter
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.05},${lat - 0.05},${lng + 0.05},${lat + 0.05}&layer=mapnik&marker=${lat},${lng}`
  }

  return (
    <div className="flex flex-col md:flex-row h-full gap-4">
      {/* Map Container */}
      <div className="flex-1 relative rounded-lg overflow-hidden border border-gray-200 shadow-lg bg-gray-100">
        <iframe
          src={generateMapUrl()}
          className="w-full h-full border-0"
          style={{ minHeight: "500px" }}
          title="Mapa de Clientes"
        />

        {/* Selected Client Info Overlay */}
        {selectedClient && (
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-xl p-4 max-w-xs z-10 border-2 border-orange-500">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-gray-900">
                  {selectedClient.nombre_completo || selectedClient.full_name}
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  ID: {selectedClient.numero_identidad || selectedClient.identity_number}
                </p>
                <p className="text-xs text-gray-600">Tel: {selectedClient.telefono || selectedClient.phone}</p>
                {selectedClient.email && <p className="text-xs text-gray-600 truncate">{selectedClient.email}</p>}
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                  {selectedClient.direccion || selectedClient.address}
                </p>
                {/* </CHANGE> */}
                <p className="text-xs text-blue-600 mt-1">
                  📍 {selectedClient.latitud?.toFixed(6)}, {selectedClient.longitud?.toFixed(6)}
                </p>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Client List Sidebar */}
      <div className="w-full md:w-80 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4">
          <h3 className="text-lg font-semibold">Clientes en el Mapa</h3>
          <p className="text-sm text-orange-100">{validClients.length} ubicaciones</p>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 250px)" }}>
          {validClients.map((client) => (
            <div
              key={client.id}
              className={`p-4 border-b border-gray-100 hover:bg-orange-50 cursor-pointer transition-colors ${
                selectedClient?.id === client.id ? "bg-orange-50 border-l-4 border-l-orange-500" : ""
              }`}
              onClick={() => handleClientClick(client)}
            >
              <div className="flex items-start gap-3">
                <Navigation className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-gray-900 truncate">
                    {client.nombre_completo || client.full_name}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">ID: {client.numero_identidad || client.identity_number}</p>
                  <p className="text-xs text-gray-600">Tel: {client.telefono || client.phone}</p>
                  {client.email && <p className="text-xs text-gray-600 truncate">{client.email}</p>}
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{client.direccion || client.address}</p>
                  {/* </CHANGE> */}
                  <p className="text-xs text-blue-600 mt-1">
                    📍 {client.latitud?.toFixed(4)}, {client.longitud?.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {validClients.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No hay clientes con ubicación registrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
