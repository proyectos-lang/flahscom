import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const maxDuration = 60
export const bodyParser = false

export async function POST(request: Request) {
  console.log("[v0] Installations API route called")

  try {
    const formData = await request.formData()

    const clientData = JSON.parse(formData.get("clientData") as string)
    const installationData = JSON.parse(formData.get("installationData") as string)
    const vendorId = formData.get("vendorId") as string
    const packageId = formData.get("packageId") as string
    const symbolicCost = Number.parseFloat(formData.get("symbolicCost") as string)

    const identityFront = formData.get("identityFront") as File | null
    const identityBack = formData.get("identityBack") as File | null
    const contract1 = formData.get("contract1") as File | null
    const contract2 = formData.get("contract2") as File | null
    const housePhoto = formData.get("housePhoto") as File | null
    const initialPaymentReceipt = formData.get("initialPaymentReceipt") as File | null

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        db: {
          schema: "public",
        },
      },
    )

    console.log("[v0] Validating duplicate numero_identidad...")

    // Validacion de seguridad: no permitir numeros de identidad duplicados en la tabla clientes
    if (!clientData.identityNumber || !String(clientData.identityNumber).trim()) {
      return NextResponse.json(
        { error: "El numero de identidad es obligatorio" },
        { status: 400 },
      )
    }

    const { data: existingClient, error: searchError } = await supabase
      .from("clientes")
      .select("id, nombre_completo, numero_identidad")
      .eq("numero_identidad", String(clientData.identityNumber).trim())
      .maybeSingle()

    if (searchError) {
      console.error("[v0] Error searching for existing client:", searchError.message)
      return NextResponse.json(
        { error: "Error al validar el numero de identidad", details: searchError.message },
        { status: 500 },
      )
    }

    if (existingClient) {
      console.log("[v0] Duplicate identity detected, rejecting registration. Existing client ID:", existingClient.id)
      return NextResponse.json(
        {
          error: `El numero de identidad ${existingClient.numero_identidad} ya esta registrado para el cliente "${existingClient.nombre_completo}". Por favor ingrese un numero de identidad diferente.`,
          code: "DUPLICATE_IDENTITY",
          existing_client_id: existingClient.id,
        },
        { status: 409 },
      )
    }

    console.log("[v0] Inserting client data...")

    const { data: maxClientData } = await supabase
      .from("clientes")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextClientId = maxClientData ? maxClientData.id + 1 : 1
    console.log("[v0] Next client ID will be:", nextClientId)

    const { data: newClient, error: clientError } = await supabase
      .from("clientes")
      .insert({
        id: nextClientId,
        nombre_completo: clientData.fullName,
        numero_identidad: String(clientData.identityNumber).trim(),
        telefono: clientData.phone,
        email: clientData.email || null,
        colonia: clientData.colonia || null,
        direccion: clientData.address,
        latitud: clientData.latitude ? Number.parseFloat(clientData.latitude) : null,
        longitud: clientData.longitude ? Number.parseFloat(clientData.longitude) : null,
      })
      .select()
      .single()

    if (clientError) {
      console.error("[v0] Error inserting client:", clientError.message)
      return NextResponse.json(
        {
          error: "Error al registrar el cliente",
          details: clientError.message,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Client inserted successfully, ID:", newClient.id)
    const clientDataResult = newClient

    const uploadFile = async (file: File | null, fileName: string): Promise<string | null> => {
      if (!file) return null

      const fileExt = file.name.split(".").pop()
      const filePath = `archivos/${Date.now()}_${fileName}.${fileExt}`

      const { data, error } = await supabase.storage.from("Archivos").upload(filePath, file, {
        contentType: file.type,
      })

      if (error) {
        console.error(`[v0] Error uploading ${fileName}:`, error)
        return null
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("Archivos").getPublicUrl(filePath)

      return publicUrl
    }

    console.log("[v0] Uploading documents...")
    const [urlIdentidadFrontal, urlIdentidadReverso, urlContrato1, urlContrato2, urlFachada, urlReciboPagoInicial] =
      await Promise.all([
        uploadFile(identityFront, "identidad_frontal"),
        uploadFile(identityBack, "identidad_reverso"),
        uploadFile(contract1, "contrato_1"),
        uploadFile(contract2, "contrato_2"),
        uploadFile(housePhoto, "fachada"),
        uploadFile(initialPaymentReceipt, "recibo_pago_inicial"),
      ])

    console.log("[v0] Documents uploaded, inserting contract...")

    const { data: maxContractData } = await supabase
      .from("contratos")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextContractId = maxContractData ? maxContractData.id + 1 : 1001
    console.log("[v0] Next contract ID will be:", nextContractId)

    const { data: contratoData, error: contratoError } = await supabase
      .from("contratos")
      .insert({
        id: nextContractId,
        cliente_id: clientDataResult.id,
        vendedor_id: vendorId,
        paquete_id: packageId,
        nombre_paquete: installationData.planType,
        valor_paquete: Number.parseFloat(installationData.monthlyFee),
        numero_contador: clientData.numeroContador || null,
        colonia: clientData.colonia || null,
        estado_auditoria: "pendiente",
        url_identidad_frontal: urlIdentidadFrontal,
        url_identidad_reverso: urlIdentidadReverso,
        url_contrato_1: urlContrato1,
        url_contrato_2: urlContrato2,
        url_fachada: urlFachada,
        url_recibo_pago_inicial: urlReciboPagoInicial,
      })
      .select()
      .single()

    if (contratoError) {
      console.error("[v0] Error inserting contract:", contratoError)
      return NextResponse.json({ error: "Error al registrar el contrato" }, { status: 500 })
    }

    console.log("[v0] Contract created successfully, ID:", contratoData.id)

    console.log("[v0] Creating payment plan for 12 months...")
    const paymentPlan = []
    const monthlyFee = Number.parseFloat(installationData.monthlyFee)
    const today = new Date()

    for (let i = 0; i < 12; i++) {
      const dueDate = new Date(today.getFullYear(), today.getMonth() + i, 15)
      const expectedAmount = i === 0 ? monthlyFee + symbolicCost : monthlyFee

      paymentPlan.push({
        contrato_id: contratoData.id,
        numero_cuota: i + 1,
        fecha_vencimiento: dueDate.toISOString().split("T")[0],
        monto_esperado: expectedAmount,
      })
    }

    const { error: planError } = await supabase.from("plan_pagos").insert(paymentPlan)

    if (planError) {
      console.error("[v0] Error creating payment plan:", planError)
    } else {
      console.log("[v0] Payment plan created successfully with 12 installments")
    }

    return NextResponse.json({
      success: true,
      client: clientDataResult,
      contrato: contratoData,
      paymentPlan: paymentPlan.length,
    })
  } catch (error) {
    console.error("[v0] Error in installations API route:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
