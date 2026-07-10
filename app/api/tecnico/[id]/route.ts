import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { 
      tipo,
      fecha_programada,
      cuadrilla_id,
      estatus_instalacion,
      estatus_falla,
      serie_ont_router, 
      serie_antena_receptor,
      url_foto_potencia_caset,
      url_foto_pi_fibra,
      url_foto_pf_fibra,
      url_foto_numeracion_nap,
      url_foto_etiqueta_cliente_nap,
      url_foto_potencia_liuk,
      url_foto_serie_equipo,
      url_foto_potencia_interna,
      url_foto_contrasena,
      url_foto_test_velocidad,
      url_foto_estetico_equipos,
      url_foto_tv_pantalla,
      url_firma_cliente, 
      observaciones_tecnicas 
    } = body

    const supabase = await getSupabaseServerClient()

    const updateData: any = {}

    if (fecha_programada !== undefined) updateData.fecha_programada = fecha_programada
    if (cuadrilla_id !== undefined) updateData.cuadrilla_id = cuadrilla_id
    if (tipo === "falla") {
      if (estatus_falla) updateData.estatus_falla = estatus_falla
      if (observaciones_tecnicas !== undefined) updateData.observaciones_tecnico = observaciones_tecnicas
    } else {
      if (estatus_instalacion) updateData.estatus_instalacion = estatus_instalacion
    }
    if (tipo !== "falla") {
      if (serie_ont_router !== undefined) updateData.serie_ont_router = serie_ont_router
      if (serie_antena_receptor !== undefined) updateData.serie_antena_receptor = serie_antena_receptor
      if (url_foto_potencia_caset !== undefined) updateData.url_foto_potencia_caset = url_foto_potencia_caset
      if (url_foto_pi_fibra !== undefined) updateData.url_foto_pi_fibra = url_foto_pi_fibra
      if (url_foto_pf_fibra !== undefined) updateData.url_foto_pf_fibra = url_foto_pf_fibra
      if (url_foto_numeracion_nap !== undefined) updateData.url_foto_numeracion_nap = url_foto_numeracion_nap
      if (url_foto_etiqueta_cliente_nap !== undefined) updateData.url_foto_etiqueta_cliente_nap = url_foto_etiqueta_cliente_nap
      if (url_foto_potencia_liuk !== undefined) updateData.url_foto_potencia_liuk = url_foto_potencia_liuk
      if (url_foto_serie_equipo !== undefined) updateData.url_foto_serie_equipo = url_foto_serie_equipo
      if (url_foto_potencia_interna !== undefined) updateData.url_foto_potencia_interna = url_foto_potencia_interna
      if (url_foto_contrasena !== undefined) updateData.url_foto_contrasena = url_foto_contrasena
      if (url_foto_test_velocidad !== undefined) updateData.url_foto_test_velocidad = url_foto_test_velocidad
      if (url_foto_estetico_equipos !== undefined) updateData.url_foto_estetico_equipos = url_foto_estetico_equipos
      if (url_foto_tv_pantalla !== undefined) updateData.url_foto_tv_pantalla = url_foto_tv_pantalla
      if (url_firma_cliente !== undefined) updateData.url_firma_cliente = url_firma_cliente
      if (observaciones_tecnicas !== undefined) updateData.observaciones_tecnicas = observaciones_tecnicas
    }

    const getHondurasTime = () =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Tegucigalpa",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      }).format(new Date())

    const getHondurasDate = () =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Tegucigalpa",
      }).format(new Date())

    // If starting installation, record hora_inicio
    if (estatus_instalacion === "en_proceso") {
      updateData.hora_inicio = getHondurasTime()
    }

    // If finishing installation, record hora_fin and fecha_real_instalacion
    if (estatus_instalacion === "instalado" || estatus_instalacion === "fallido") {
      updateData.hora_fin = getHondurasTime()
      updateData.fecha_real_instalacion = getHondurasDate()
    }

    // Route to correct table based on tipo
    const table = tipo === "falla" ? "fallas" : "instalaciones"

    const { data: instalacion, error } = await supabase
      .from(table)
      .update(updateData)
      .eq("id", Number.parseInt(id))
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating instalacion:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If finished, also update the contrato estatusinstalacion
    if (estatus_instalacion === "instalado" && instalacion) {
      const { error: contratoError } = await supabase
        .from("contratos")
        .update({ estatusinstalacion: "instalado" })
        .eq("id", instalacion.contrato_id)

      if (contratoError) {
        console.error("[v0] Error updating contrato status:", contratoError)
      }
    }

    return NextResponse.json({ success: true, data: instalacion })
  } catch (error: any) {
    console.error("[v0] Error in tecnico PATCH:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
