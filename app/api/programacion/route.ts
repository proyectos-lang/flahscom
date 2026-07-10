import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get("tipo") || "instalaciones" // 'instalaciones' or 'fallas'

    const supabase = await getSupabaseServerClient()

    if (tipo === "fallas") {
      // Get reported fallas that haven't been scheduled yet
      const { data: fallas, error } = await supabase
        .from("fallas")
        .select(`
          id,
          contrato_id,
          reportado_por,
          telefono_contacto_adicional,
          tipo_falla,
          descripcion_falla,
          fecha_preferencia_cliente,
          estatus_falla,
          created_at,
          contratos (
            id,
            nombre_paquete,
            valor_paquete,
            clientes (
              nombre_completo,
              telefono,
              colonia,
              direccion,
              latitud,
              longitud
            )
          )
        `)
        .eq("estatus_falla", "reportada")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Error fetching fallas:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const result = (fallas || []).map((f: any) => ({
        id: f.id,
        contrato_id: f.contrato_id,
        nombre_completo: f.contratos?.clientes?.nombre_completo || "N/A",
        telefono: f.contratos?.clientes?.telefono || "",
        colonia: f.contratos?.clientes?.colonia || "",
        direccion: f.contratos?.clientes?.direccion || "",
        nombre_paquete: f.contratos?.nombre_paquete || "",
        valor_paquete: f.contratos?.valor_paquete || 0,
        reportado_por: f.reportado_por,
        tipo_falla: f.tipo_falla,
        descripcion_falla: f.descripcion_falla,
        fecha_preferencia_cliente: f.fecha_preferencia_cliente,
        created_at: f.created_at,
        latitud: f.contratos?.clientes?.latitud || null,
        longitud: f.contratos?.clientes?.longitud || null,
      }))

      return NextResponse.json({ success: true, data: result })
    } else {
      // Get approved contracts that have NOT been programmed yet
      const { data: contratos, error } = await supabase
        .from("contratos")
        .select(`
          id,
          nombre_paquete,
          valor_paquete,
          fecha_contratacion,
          fechanormal,
          estatusinstalacion,
          clientes(nombre_completo, telefono, colonia, direccion, latitud, longitud)
        `)
        .eq("estado_auditoria", "aprobada")
        .or("estatusinstalacion.is.null,estatusinstalacion.eq.pendiente")
        .order("fecha_contratacion", { ascending: false })

      if (error) {
        console.error("[v0] Error fetching programacion contracts:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const result = (contratos || []).map((c: any) => ({
        id: c.id,
        nombre_completo: c.clientes?.nombre_completo || "N/A",
        telefono: c.clientes?.telefono || "",
        colonia: c.clientes?.colonia || "",
        direccion: c.clientes?.direccion || "",
        nombre_paquete: c.nombre_paquete,
        valor_paquete: c.valor_paquete,
        fecha_contratacion: c.fechanormal || c.fecha_contratacion,
        latitud: c.clientes?.latitud || null,
        longitud: c.clientes?.longitud || null,
      }))

      return NextResponse.json({ success: true, data: result })
    }
  } catch (error: any) {
    console.error("[v0] Error in programacion GET:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { contrato_id, cuadrilla_id, fecha_programada, bloque_horario } = body

    if (!contrato_id || !cuadrilla_id || !fecha_programada || !bloque_horario) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Create the installation record
    const { data: instalacion, error: insertError } = await supabase
      .from("instalaciones")
      .insert({
        contrato_id,
        cuadrilla_id: Number(cuadrilla_id),
        fecha_programada,
        bloque_horario,
        estatus_instalacion: "programada",
        tipo: "Instalacion nueva",
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error creating instalacion:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Update contract status to 'programado'
    const { error: updateError } = await supabase
      .from("contratos")
      .update({ estatusinstalacion: "programada" })
      .eq("id", contrato_id)

    if (updateError) {
      console.error("[v0] Error updating contrato status:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: instalacion })
  } catch (error: any) {
    console.error("[v0] Error in programacion POST:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
