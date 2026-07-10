import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

// For scheduling a falla from programacion
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { cuadrilla_id, fecha_programada, bloque_horario } = body

    if (!cuadrilla_id || !fecha_programada || !bloque_horario) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos: cuadrilla_id, fecha_programada, bloque_horario" },
        { status: 400 }
      )
    }

    const supabase = await getSupabaseServerClient()

    // Update the falla record
    const { data: falla, error } = await supabase
      .from("fallas")
      .update({
        cuadrilla_id: Number(cuadrilla_id),
        fecha_programada,
        bloque_horario,
        estatus_falla: "programada",
      })
      .eq("id", Number(id))
      .select()
      .single()

    if (error) {
      console.error("[v0] Error scheduling falla:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Falla scheduled successfully:", falla.id)

    return NextResponse.json({ success: true, falla })
  } catch (error: any) {
    console.error("[v0] Error in fallas PATCH:", error)
    return NextResponse.json({ error: error.message || "Error al programar la falla" }, { status: 500 })
  }
}

// For updating falla execution status from tecnico
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { 
      estatus_falla,
      hora_inicio,
      hora_fin,
      urls_evidencias,
      url_firma_cliente,
      observaciones_tecnico,
      fecha_real_resolucion,
      fecha_preferencia_cliente
    } = body

    const supabase = await getSupabaseServerClient()

    const updateData: any = {}

    if (estatus_falla !== undefined) updateData.estatus_falla = estatus_falla
    if (hora_inicio !== undefined) updateData.hora_inicio = hora_inicio
    if (hora_fin !== undefined) updateData.hora_fin = hora_fin
    if (urls_evidencias !== undefined) updateData.urls_evidencias = urls_evidencias
    if (url_firma_cliente !== undefined) updateData.url_firma_cliente = url_firma_cliente
    if (observaciones_tecnico !== undefined) updateData.observaciones_tecnico = observaciones_tecnico
    if (fecha_real_resolucion !== undefined) updateData.fecha_real_resolucion = fecha_real_resolucion
    if (fecha_preferencia_cliente !== undefined) updateData.fecha_preferencia_cliente = fecha_preferencia_cliente

    const { data: falla, error } = await supabase
      .from("fallas")
      .update(updateData)
      .eq("id", Number(id))
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating falla:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Falla updated successfully:", falla.id, "status:", falla.estatus_falla)

    return NextResponse.json({ success: true, falla })
  } catch (error: any) {
    console.error("[v0] Error in fallas PUT:", error)
    return NextResponse.json({ error: error.message || "Error al actualizar la falla" }, { status: 500 })
  }
}
