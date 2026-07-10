import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const contractId = Number.parseInt(id)

    // Get contract
    const { data: contrato, error: contratoError } = await supabase
      .from("contratos")
      .select("*")
      .eq("id", contractId)
      .single()

    if (contratoError || !contrato) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 })
    }

    // Get client data
    let cliente = null
    if (contrato.cliente_id) {
      const { data: clienteData } = await supabase.from("clientes").select("*").eq("id", contrato.cliente_id).single()
      cliente = clienteData
    }

    // Get package data
    let paquete = null
    if (contrato.paquete_id) {
      const { data: paqueteData } = await supabase.from("paquetes").select("*").eq("id", contrato.paquete_id).single()
      paquete = paqueteData
    }

    // Get vendor data
    let vendedor = null
    if (contrato.vendedor_id) {
      const { data: vendedorData } = await supabase
        .from("vendedores")
        .select("*")
        .eq("id", contrato.vendedor_id)
        .single()
      vendedor = vendedorData
    }

    return NextResponse.json({
      ...contrato,
      cliente,
      paquete,
      vendedor,
    })
  } catch (error) {
    console.error("[v0] Error fetching contract:", error)
    return NextResponse.json({ error: "Error al cargar contrato" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const contractId = Number.parseInt(id)
    const body = await request.json()
    const { field, url } = body

    const allowedFields = [
      "url_identidad_frontal",
      "url_identidad_reverso",
      "url_contrato_1",
      "url_contrato_2",
      "url_fachada",
      "url_recibo_pago_inicial",
    ]

    if (!allowedFields.includes(field)) {
      return NextResponse.json({ error: "Campo no permitido" }, { status: 400 })
    }

    const { error } = await supabase
      .from("contratos")
      .update({ [field]: url ?? null })
      .eq("id", contractId)

    if (error) {
      console.error("[v0] Error updating image field:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in PATCH contract:", error)
    return NextResponse.json({ error: "Error al actualizar imagen" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const contractId = Number.parseInt(id)
    const body = await request.json()

    const { clientData, vendorId, packageId, numeroContador, installationData } = body

    // Get the contract first to get cliente_id
    const { data: contrato, error: contratoError } = await supabase
      .from("contratos")
      .select("cliente_id")
      .eq("id", contractId)
      .single()

    if (contratoError || !contrato) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 })
    }

    // Update client data
    if (contrato.cliente_id && clientData) {
      const { error: clienteError } = await supabase
        .from("clientes")
        .update({
          nombre_completo: clientData.fullName,
          numero_identidad: clientData.identityNumber,
          telefono: clientData.phone,
          email: clientData.email,
          direccion: clientData.address,
          latitud: clientData.latitude ? Number.parseFloat(clientData.latitude) : null,
          longitud: clientData.longitude ? Number.parseFloat(clientData.longitude) : null,
        })
        .eq("id", contrato.cliente_id)

      if (clienteError) {
        console.error("[v0] Error updating client:", clienteError)
        return NextResponse.json({ error: "Error al actualizar cliente" }, { status: 500 })
      }
    }

    // Get package data for pricing
    let valorPaquete = 0
    let nombrePaquete = ""
    if (packageId) {
      const { data: paquete } = await supabase
        .from("paquetes")
        .select("nombre, precio_mensual")
        .eq("id", packageId)
        .single()

      if (paquete) {
        valorPaquete = paquete.precio_mensual
        nombrePaquete = paquete.nombre
      }
    }

    // Update contract
    const { error: contratoUpdateError } = await supabase
      .from("contratos")
      .update({
        vendedor_id: vendorId || null,
        paquete_id: packageId || null,
        numero_contador: numeroContador,
        nombre_paquete: nombrePaquete,
        valor_paquete: valorPaquete,
        notas: installationData?.notes || null,
        observaciones_rechazo: installationData?.observacionesRechazo || null,
      })
      .eq("id", contractId)

    if (contratoUpdateError) {
      console.error("[v0] Error updating contract:", contratoUpdateError)
      return NextResponse.json({ error: "Error al actualizar contrato" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Contrato actualizado exitosamente" })
  } catch (error) {
    console.error("[v0] Error updating contract:", error)
    return NextResponse.json({ error: "Error al actualizar contrato" }, { status: 500 })
  }
}
