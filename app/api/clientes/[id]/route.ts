import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const clienteId = Number.parseInt(id)

    if (Number.isNaN(clienteId)) {
      return NextResponse.json({ error: "ID de cliente inválido" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Get cliente with their contratos
    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .select(`
        id,
        nombre_completo,
        numero_identidad,
        telefono,
        direccion,
        latitud,
        longitud
      `)
      .eq("id", clienteId)
      .single()

    if (clienteError || !cliente) {
      console.error("[v0] Error fetching cliente:", clienteError)
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    // Get contratos for this cliente
    const { data: contratos, error: contratosError } = await supabase
      .from("contratos")
      .select("id, nombre_paquete, valor_paquete, fecha_contratacion, estado_auditoria")
      .eq("cliente_id", clienteId)
      .order("fecha_contratacion", { ascending: false })

    if (contratosError) {
      console.error("[v0] Error fetching contratos:", contratosError)
    }

    console.log("[v0] Cliente", clienteId, "found with", (contratos || []).length, "contratos")

    return NextResponse.json({
      ...cliente,
      contratos: contratos || [],
    })
  } catch (error: any) {
    console.error("[v0] Error in clientes [id] GET:", error)
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
