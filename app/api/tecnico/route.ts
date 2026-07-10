import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cuadrillaId = searchParams.get("cuadrilla_id")

    if (!cuadrillaId) {
      return NextResponse.json({ error: "Cuadrilla es requerida" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Get today's date in Honduras timezone (UTC-6)
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Tegucigalpa" }))
    const todayStr = today.toISOString().split("T")[0]

    // Get installations assigned to this cuadrilla that are programado or en_proceso
    const { data: instalaciones, error } = await supabase
      .from("instalaciones")
      .select(`
        id,
        contrato_id,
        cuadrilla_id,
        fecha_programada,
        bloque_horario,
        estatus_instalacion,
        hora_inicio,
        hora_fin,
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
        observaciones_tecnicas,
        fecha_real_instalacion,
        created_at
      `)
      .eq("cuadrilla_id", Number(cuadrillaId))
      .eq("fecha_programada", todayStr)
      .in("estatus_instalacion", ["programada", "en_ruta", "en_proceso"])
      .order("fecha_programada", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching tecnico instalaciones:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get contract and client details for each installation
    const contratoIds = (instalaciones || []).map((i: any) => i.contrato_id)

    let contratosMap: Record<number, any> = {}
    if (contratoIds.length > 0) {
      const { data: contratos, error: contratosError } = await supabase
        .from("contratos")
        .select(`
          id,
          nombre_paquete,
          valor_paquete,
          numero_contador,
          clientes(nombre_completo, telefono, direccion, latitud, longitud),
          paquetes(velocidad)
        `)
        .in("id", contratoIds)

      if (!contratosError && contratos) {
        for (const c of contratos) {
          contratosMap[c.id] = c
        }
      }
    }

    const result = (instalaciones || []).map((inst: any) => {
      const contrato = contratosMap[inst.contrato_id] || {}
      return {
        ...inst,
        nombre_completo: contrato.clientes?.nombre_completo || "N/A",
        telefono: contrato.clientes?.telefono || "",
        direccion: contrato.clientes?.direccion || "",
        latitud: contrato.clientes?.latitud || null,
        longitud: contrato.clientes?.longitud || null,
        nombre_paquete: contrato.nombre_paquete || "",
        valor_paquete: contrato.valor_paquete || 0,
        numero_contador: contrato.numero_contador || "",
        velocidad: contrato.paquetes?.velocidad || "",
      }
    })

    // Also get fallas assigned to this cuadrilla
    const { data: fallas, error: fallasError } = await supabase
      .from("fallas")
      .select(`
        id,
        contrato_id,
        cuadrilla_id,
        fecha_programada,
        bloque_horario,
        estatus_falla,
        tipo_falla,
        descripcion_falla,
        telefono_contacto_adicional,
        hora_inicio,
        hora_fin,
        urls_evidencias,
        url_firma_cliente,
        observaciones_tecnico,
        fecha_real_resolucion,
        created_at
      `)
      .eq("cuadrilla_id", Number(cuadrillaId))
      .eq("fecha_programada", todayStr)
      .in("estatus_falla", ["programada", "en_proceso"])
      .order("fecha_programada", { ascending: true })

    if (fallasError) {
      console.error("[v0] Error fetching fallas:", fallasError)
    }

    // Get contract details for fallas
    const fallaContratoIds = (fallas || []).map((f: any) => f.contrato_id)
    let fallaContratosMap: Record<number, any> = {}
    if (fallaContratoIds.length > 0) {
      const { data: contratos, error: contratosError } = await supabase
        .from("contratos")
        .select(`
          id,
          nombre_paquete,
          valor_paquete,
          numero_contador,
          clientes(nombre_completo, telefono, direccion, latitud, longitud),
          paquetes(velocidad)
        `)
        .in("id", fallaContratoIds)

      if (!contratosError && contratos) {
        for (const c of contratos) {
          fallaContratosMap[c.id] = c
        }
      }
    }

    const fallasResult = (fallas || []).map((falla: any) => {
      const contrato = fallaContratosMap[falla.contrato_id] || {}
      return {
        ...falla,
        tipo: "falla",
        nombre_completo: contrato.clientes?.nombre_completo || "N/A",
        telefono: contrato.clientes?.telefono || "",
        telefono_contacto_adicional: falla.telefono_contacto_adicional || "",
        direccion: contrato.clientes?.direccion || "",
        latitud: contrato.clientes?.latitud || null,
        longitud: contrato.clientes?.longitud || null,
        nombre_paquete: contrato.nombre_paquete || "",
        valor_paquete: contrato.valor_paquete || 0,
        numero_contador: contrato.numero_contador || "",
        velocidad: contrato.paquetes?.velocidad || "",
      }
    })

    // Mark instalaciones with tipo
    const instalacionesWithType = result.map((inst: any) => ({ ...inst, tipo: "instalacion" }))

    // Combine and return both
    const combined = [...instalacionesWithType, ...fallasResult].sort((a, b) => {
      return new Date(a.fecha_programada).getTime() - new Date(b.fecha_programada).getTime()
    })

    return NextResponse.json({ success: true, data: combined })
  } catch (error: any) {
    console.error("[v0] Error in tecnico GET:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
