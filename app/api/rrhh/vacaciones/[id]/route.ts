import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Build update object dynamically
    const updateData: Record<string, any> = {}
    if (body.estado !== undefined) updateData.estado = body.estado
    if (body.url_documento_firmado !== undefined) updateData.url_documento_firmado = body.url_documento_firmado
    if (body.fecha_inicio !== undefined) updateData.fecha_inicio = body.fecha_inicio
    if (body.fecha_fin !== undefined) updateData.fecha_fin = body.fecha_fin
    if (body.dias_solicitados !== undefined) updateData.dias_solicitados = body.dias_solicitados
    if (body.motivo !== undefined) updateData.motivo = body.motivo

    // When editing the date range, validate the requested days against the
    // employee's accrued balance (vw_control_vacaciones), excluding the days
    // already counted for THIS request so an edit doesn't double-count itself.
    if (body.dias_solicitados !== undefined) {
      const { data: current } = await supabase
        .from("vacaciones")
        .select("empleado_id, dias_solicitados, estado")
        .eq("id", id)
        .single()

      if (current) {
        const { data: controlRow } = await supabase
          .from("vw_control_vacaciones")
          .select("dias_acumulados_ley, dias_tomados")
          .eq("empleado_id", current.empleado_id)
          .maybeSingle()

        if (controlRow) {
          const diasAcumulados = Number(controlRow.dias_acumulados_ley ?? 0)
          const diasTomados = Number(controlRow.dias_tomados ?? 0)
          // dias_tomados only counts approved requests; add back this request's
          // current days if it was already approved so we compare correctly.
          const tomadosSinEsta =
            current.estado === "aprobada"
              ? diasTomados - Number(current.dias_solicitados ?? 0)
              : diasTomados
          const disponibles = diasAcumulados - tomadosSinEsta
          if (Number(body.dias_solicitados) > disponibles) {
            return NextResponse.json(
              {
                success: false,
                error: `Los dias solicitados (${body.dias_solicitados}) exceden el saldo disponible del empleado (${disponibles} dias).`,
              },
              { status: 400 },
            )
          }
        }
      }
    }

    const { data, error } = await supabase
      .from("vacaciones")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error updating vacacion:", error)
    return NextResponse.json({ success: false, error: "Error al actualizar vacacion" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await supabase.from("vacaciones").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting vacacion:", error)
    return NextResponse.json({ success: false, error: "Error al eliminar vacacion" }, { status: 500 })
  }
}
