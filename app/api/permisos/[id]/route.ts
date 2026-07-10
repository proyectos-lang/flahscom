import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await getSupabaseServerClient()

    // Update permissions
    const { data, error } = await supabase
      .from("permisos")
      .update({
        dashboard: body.dashboard,
        dashboard_diario: body.dashboard_diario,
        alertas: body.alertas,
        ventas: body.ventas,
        auditoria: body.auditoria,
        cartera: body.cartera,
        cobros: body.cobros,
        vendedores: body.vendedores,
        paquetes: body.paquetes,
        clientes: body.clientes,
        mapa: body.mapa,
        historial_pagos: body.historial_pagos,
        instalaciones: body.instalaciones,
        historial_instalaciones: body.historial_instalaciones,
        call_center: body.call_center,
        programacion: body.programacion,
        vista_tecnico: body.vista_tecnico,
        usuarios: body.usuarios,
        permisos: body.permisos,
        rrhh: body.rrhh,
        gastos: body.gastos,
        inventario: body.inventario,
        updated_at: new Date().toISOString(),
      })
      .eq("id", Number.parseInt(id))
      .select()

    if (error) {
      console.error("[v0] Error updating permissions:", error)
      return NextResponse.json({ error: "Error al actualizar permisos" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in PUT permisos:", error)
    return NextResponse.json({ error: "Error al procesar solicitud" }, { status: 500 })
  }
}
