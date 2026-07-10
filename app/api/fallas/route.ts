import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      contrato_id,
      reportado_por,
      telefono_contacto_adicional,
      tipo_falla,
      descripcion_falla,
      fecha_preferencia_cliente,
    } = body

    // Validate required fields
    if (!contrato_id || !reportado_por || !tipo_falla) {
      return NextResponse.json(
        { error: "Campos requeridos faltantes: contrato_id, reportado_por, tipo_falla" },
        { status: 400 }
      )
    }

    const supabase = await getSupabaseServerClient()

    // Create the falla record
    const { data: falla, error } = await supabase
      .from("fallas")
      .insert({
        contrato_id: Number(contrato_id),
        reportado_por: reportado_por.trim(),
        telefono_contacto_adicional: telefono_contacto_adicional?.trim() || null,
        tipo_falla: tipo_falla.trim(),
        descripcion_falla: descripcion_falla?.trim() || null,
        fecha_preferencia_cliente: fecha_preferencia_cliente || null,
        estatus_falla: "reportada",
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating falla:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Falla created successfully:", falla.id)

    return NextResponse.json({ success: true, falla })
  } catch (error: any) {
    console.error("[v0] Error in fallas POST:", error)
    return NextResponse.json({ error: error.message || "Error al crear la orden de falla" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"))
    const limit = 50
    const contratoId = searchParams.get("contrato_id")

    const offset = (page - 1) * limit

    const supabase = await getSupabaseServerClient()

    // If searching by contrato_id, return fallas for that contract
    if (contratoId) {
      console.log("[v0] Searching fallas for contrato_id:", contratoId)
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
          created_at
        `)
        .eq("contrato_id", Number(contratoId))
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Error fetching fallas by contrato:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      console.log("[v0] Fallas found for contrato:", fallas?.length || 0)
      return NextResponse.json(fallas || [])
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from("fallas")
      .select("*", { count: "exact", head: true })

    if (countError) {
      console.error("[v0] Error getting fallas count:", countError)
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    // Get paginated fallas with contrato info
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
            telefono
          )
        )
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("[v0] Error fetching fallas:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      success: true,
      fallas: fallas || [],
      total: count || 0,
      page,
      totalPages,
    })
  } catch (error: any) {
    console.error("[v0] Error in fallas GET:", error)
    return NextResponse.json({ error: error.message || "Error al obtener fallas" }, { status: 500 })
  }
}
