"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect, useRouter } from "next/navigation"
import { useEffect } from "react"

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      redirect("/login")
    }
  }, [user, isLoading])

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    )
  }

  const permissions = user.permissions

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto pb-24 md:pb-6">
      <div className="mb-4 md:mb-6 text-center md:text-left">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Bienvenido, {user.full_name}</h1>
        <p className="text-xs md:text-sm text-gray-500 mt-1">Selecciona un módulo para comenzar</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        {permissions?.dashboard_diario && (
          <Card
            className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-green-300 cursor-pointer bg-white"
            onClick={() => router.push("/daily-dashboard")}
          >
            <CardHeader className="p-3 md:p-4 pb-2 md:pb-2">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 md:p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg group-hover:from-green-100 group-hover:to-green-200 transition-colors">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-center text-xs md:text-sm font-semibold text-gray-700">
                Dashboard Diario
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-1 md:pt-1">
              <p className="text-[10px] md:text-xs text-center text-gray-500 leading-tight">Ventas y pagos del día</p>
            </CardContent>
          </Card>
        )}

        {permissions?.alertas && (
          <Card
            className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-orange-300 cursor-pointer bg-white"
            onClick={() => router.push("/alertas")}
          >
            <CardHeader className="p-3 md:p-4 pb-2 md:pb-2">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 md:p-3 bg-gradient-to-br from-orange-50 to-red-100 rounded-lg group-hover:from-orange-100 group-hover:to-red-200 transition-colors">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-orange-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-center text-xs md:text-sm font-semibold text-gray-700">
                Centro de Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-1 md:pt-1">
              <p className="text-[10px] md:text-xs text-center text-gray-500 leading-tight">Activaciones y reconexiones</p>
            </CardContent>
          </Card>
        )}

        {permissions?.ventas && (
          <Card
            className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-orange-300 cursor-pointer bg-white"
            onClick={() => router.push("/sales")}
          >
            <CardHeader className="p-3 md:p-4 pb-2 md:pb-2">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 md:p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg group-hover:from-orange-100 group-hover:to-orange-200 transition-colors">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-orange-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-center text-xs md:text-sm font-semibold text-gray-700">Ventas</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-1 md:pt-1">
              <p className="text-[10px] md:text-xs text-center text-gray-500 leading-tight">Registrar contratos</p>
            </CardContent>
          </Card>
        )}

        {permissions?.auditoria && (
          <Card
            className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-blue-300 cursor-pointer bg-white"
            onClick={() => router.push("/audit")}
          >
            <CardHeader className="p-3 md:p-4 pb-2 md:pb-2">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 md:p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg group-hover:from-blue-100 group-hover:to-blue-200 transition-colors">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-center text-xs md:text-sm font-semibold text-gray-700">Auditoría</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-1 md:pt-1">
              <p className="text-[10px] md:text-xs text-center text-gray-500 leading-tight">Aprobar contratos</p>
            </CardContent>
          </Card>
        )}

        {permissions?.instalaciones && (
          <Card
            className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-orange-300 cursor-pointer bg-white"
            onClick={() => router.push("/instalaciones")}
          >
            <CardHeader className="p-3 md:p-4 pb-2 md:pb-2">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 md:p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg group-hover:from-orange-100 group-hover:to-orange-200 transition-colors">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-orange-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-center text-xs md:text-sm font-semibold text-gray-700">
                Instalaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-1 md:pt-1">
              <p className="text-[10px] md:text-xs text-center text-gray-500 leading-tight">Gestionar instalaciones</p>
            </CardContent>
          </Card>
        )}

        {permissions?.cartera && (
          <Card
            className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-orange-300 cursor-pointer bg-white"
            onClick={() => router.push("/portfolio")}
          >
            <CardHeader className="p-3 md:p-4 pb-2 md:pb-2">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 md:p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg group-hover:from-orange-100 group-hover:to-orange-200 transition-colors">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-orange-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-center text-xs md:text-sm font-semibold text-gray-700">Cartera</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-1 md:pt-1">
              <p className="text-[10px] md:text-xs text-center text-gray-500 leading-tight">Estado de pagos</p>
            </CardContent>
          </Card>
        )}

        {permissions?.cobros && (
          <Card
            className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-blue-300 cursor-pointer bg-white"
            onClick={() => router.push("/payments")}
          >
            <CardHeader className="p-3 md:p-4 pb-2 md:pb-2">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 md:p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg group-hover:from-blue-100 group-hover:to-blue-200 transition-colors">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-center text-xs md:text-sm font-semibold text-gray-700">Cobros</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-1 md:pt-1">
              <p className="text-[10px] md:text-xs text-center text-gray-500 leading-tight">Registrar pagos</p>
            </CardContent>
          </Card>
        )}

        {permissions?.historial_pagos && (
          <Card
            className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-orange-300 cursor-pointer bg-white"
            onClick={() => router.push("/payment-history")}
          >
            <CardHeader className="p-3 md:p-4 pb-2 md:pb-2">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 md:p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg group-hover:from-orange-100 group-hover:to-orange-200 transition-colors">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-orange-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-center text-xs md:text-sm font-semibold text-gray-700">Historial</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-1 md:pt-1">
              <p className="text-[10px] md:text-xs text-center text-gray-500 leading-tight">Historial de pagos</p>
            </CardContent>
          </Card>
        )}

        {permissions?.vendedores && (
          <Card
            className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-orange-300 cursor-pointer bg-white"
            onClick={() => router.push("/vendors")}
          >
            <CardHeader className="p-3 md:p-4 pb-2 md:pb-2">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 md:p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg group-hover:from-orange-100 group-hover:to-orange-200 transition-colors">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-orange-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-center text-xs md:text-sm font-semibold text-gray-700">Vendedores</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-1 md:pt-1">
              <p className="text-[10px] md:text-xs text-center text-gray-500 leading-tight">Gestionar vendedores</p>
            </CardContent>
          </Card>
        )}

        {permissions?.clientes && (
          <Card
            className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-green-300 cursor-pointer bg-white"
            onClick={() => router.push("/clientes")}
          >
            <CardHeader className="p-3 md:p-4 pb-2 md:pb-2">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 md:p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg group-hover:from-green-100 group-hover:to-green-200 transition-colors">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-center text-xs md:text-sm font-semibold text-gray-700">Clientes</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-1 md:pt-1">
              <p className="text-[10px] md:text-xs text-center text-gray-500 leading-tight">Gestionar clientes</p>
            </CardContent>
          </Card>
        )}

        {permissions?.paquetes && (
          <Card
            className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-blue-300 cursor-pointer bg-white"
            onClick={() => router.push("/packages")}
          >
            <CardHeader className="p-3 md:p-4 pb-2 md:pb-2">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 md:p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg group-hover:from-blue-100 group-hover:to-blue-200 transition-colors">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-center text-xs md:text-sm font-semibold text-gray-700">Paquetes</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-1 md:pt-1">
              <p className="text-[10px] md:text-xs text-center text-gray-500 leading-tight">Gestionar paquetes</p>
            </CardContent>
          </Card>
        )}

        {permissions?.mapa && (
          <Card
            className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-orange-300 cursor-pointer bg-white"
            onClick={() => router.push("/map")}
          >
            <CardHeader className="p-3 md:p-4 pb-2 md:pb-2">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 md:p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg group-hover:from-orange-100 group-hover:to-orange-200 transition-colors">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-orange-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-center text-xs md:text-sm font-semibold text-gray-700">Mapa</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-1 md:pt-1">
              <p className="text-[10px] md:text-xs text-center text-gray-500 leading-tight">Ubicación clientes</p>
            </CardContent>
          </Card>
        )}

        {permissions?.usuarios && (
          <Card
            className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-blue-300 cursor-pointer bg-white"
            onClick={() => router.push("/usuarios")}
          >
            <CardHeader className="p-3 md:p-4 pb-2 md:pb-2">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 md:p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg group-hover:from-blue-100 group-hover:to-blue-200 transition-colors">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-center text-xs md:text-sm font-semibold text-gray-700">Usuarios</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-1 md:pt-1">
              <p className="text-[10px] md:text-xs text-center text-gray-500 leading-tight">Gestionar usuarios</p>
            </CardContent>
          </Card>
        )}

        {permissions?.permisos && (
          <Card
            className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-orange-300 cursor-pointer bg-white"
            onClick={() => router.push("/permisos")}
          >
            <CardHeader className="p-3 md:p-4 pb-2 md:pb-2">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 md:p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg group-hover:from-orange-100 group-hover:to-orange-200 transition-colors">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-orange-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-center text-xs md:text-sm font-semibold text-gray-700">Permisos</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-1 md:pt-1">
              <p className="text-[10px] md:text-xs text-center text-gray-500 leading-tight">Gestionar permisos</p>
            </CardContent>
          </Card>
        )}

        {permissions?.rrhh && (
          <Card
            className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-purple-300 cursor-pointer bg-white"
            onClick={() => router.push("/rrhh")}
          >
            <CardHeader className="p-3 md:p-4 pb-2 md:pb-2">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 md:p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg group-hover:from-purple-100 group-hover:to-purple-200 transition-colors">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-purple-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-center text-xs md:text-sm font-semibold text-gray-700">RRHH</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-1 md:pt-1">
              <p className="text-[10px] md:text-xs text-center text-gray-500 leading-tight">Recursos Humanos</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
