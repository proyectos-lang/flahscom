import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

// GET /api/inventario/productos
// Returns the catalog of products. Optional ?tipo=Serializado|Miscelaneo filters
// the result, used by the UI dropdowns to constrain by product type.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get("tipo")
    const supabase = await getSupabaseServerClient()

    let query = supabase
      .from("catalogo_productos")
      .select("id, nombre, tipo, unidad_medida")
      .order("nombre", { ascending: true })

    if (tipo === "Serializado" || tipo === "Miscelaneo") {
      query = query.eq("tipo", tipo)
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ success: true, data: data || [] })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST /api/inventario/productos
// Creates a new catalog product. Body: { nombre, tipo, unidad_medida }.
//
// Idempotency: this endpoint guards against duplicates by checking for an
// existing row with the same `nombre` (case-insensitive) BEFORE inserting.
// React Strict Mode and accidental double-clicks were causing the same
// product to land in catalogo_productos twice; the client-side `savingNew`
// flag is async and can't reliably block the second request, so the real
// fix lives here.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre, tipo, unidad_medida } = body
    if (!nombre || !tipo) {
      return NextResponse.json(
        { success: false, error: "nombre y tipo son requeridos" },
        { status: 400 },
      )
    }
    if (tipo !== "Serializado" && tipo !== "Miscelaneo") {
      return NextResponse.json(
        { success: false, error: "tipo debe ser Serializado o Miscelaneo" },
        { status: 400 },
      )
    }

    const supabase = await getSupabaseServerClient()

    // Case-insensitive duplicate check. `ilike` with no wildcards behaves as
    // an equality match while ignoring letter case.
    const trimmedNombre = String(nombre).trim()
    const { data: existing, error: dupErr } = await supabase
      .from("catalogo_productos")
      .select("id, nombre, tipo, unidad_medida")
      .ilike("nombre", trimmedNombre)
      .maybeSingle()
    if (dupErr) throw dupErr
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `Ya existe un producto con el nombre "${existing.nombre}"`,
          data: existing,
        },
        { status: 409 },
      )
    }

    const { data, error } = await supabase
      .from("catalogo_productos")
      .insert({ nombre: trimmedNombre, tipo, unidad_medida: unidad_medida || "Unidad" })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
