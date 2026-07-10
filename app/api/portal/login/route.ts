import { getSupabaseServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

// Public customer-portal authentication.
//
// The client is shared a single public link (/portal) and logs in by typing
// their national ID (cédula) as BOTH the username and password. This endpoint
// receives that cédula, verifies it exists in `clientes.numero_identidad`, and
// returns the client's name plus every contract they own so the portal can let
// them pick one when there is more than a single contract.
//
// This route is intentionally NOT behind the app auth — it only exposes
// read-only, low-sensitivity billing info scoped to the exact cédula provided.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const cedula = String(body?.cedula ?? "").trim()

    if (!cedula) {
      return NextResponse.json({ error: "Debe ingresar su número de cédula" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // A cédula can appear across more than one cliente record, so gather all of
    // them and merge their contracts.
    const { data: clientes, error: clientesError } = await supabase
      .from("clientes")
      .select("id, nombre_completo, numero_identidad")
      .eq("numero_identidad", cedula)

    if (clientesError) {
      console.error("[v0] Portal login - error fetching clientes:", clientesError)
      return NextResponse.json({ error: "Error al validar la cédula" }, { status: 500 })
    }

    if (!clientes || clientes.length === 0) {
      return NextResponse.json(
        { error: "No encontramos una cuenta con esa cédula. Verifique el número e intente de nuevo." },
        { status: 404 },
      )
    }

    const clienteIds = clientes.map((c: any) => c.id)
    const nombre = clientes[0].nombre_completo as string

    const { data: contratos, error: contratosError } = await supabase
      .from("contratos")
      .select("id, nombre_paquete, valor_paquete, numero_contador, fecha_contratacion, cliente_id")
      .in("cliente_id", clienteIds)
      .order("id", { ascending: false })

    if (contratosError) {
      console.error("[v0] Portal login - error fetching contratos:", contratosError)
      return NextResponse.json({ error: "Error al obtener sus contratos" }, { status: 500 })
    }

    console.log("[v0] Portal login OK - cedula:", cedula, "contratos:", contratos?.length || 0)

    return NextResponse.json({
      success: true,
      cliente: { nombre_completo: nombre, numero_identidad: cedula },
      contratos: contratos || [],
    })
  } catch (error: any) {
    console.error("[v0] Portal login error:", error)
    return NextResponse.json({ error: error.message || "Error al iniciar sesión" }, { status: 500 })
  }
}
