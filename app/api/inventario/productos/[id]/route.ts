import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

// PATCH /api/inventario/productos/[id]
// Allows renaming a product (and updating its unidad_medida). Tipo is intentionally
// not editable post-creation because flipping Serializado <-> Miscelaneo would
// invalidate every dependent row in inventario_serializado / transacciones.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const productoId = Number(id)
    if (!Number.isFinite(productoId)) {
      return NextResponse.json(
        { success: false, error: "id invalido" },
        { status: 400 },
      )
    }
    const body = await request.json()
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : undefined
    const unidad_medida =
      typeof body.unidad_medida === "string" ? body.unidad_medida.trim() : undefined

    if (!nombre && !unidad_medida) {
      return NextResponse.json(
        { success: false, error: "Nada que actualizar" },
        { status: 400 },
      )
    }

    const supabase = await getSupabaseServerClient()

    // Guard against renaming into an existing name (case-insensitive). Skip
    // the duplicate check when the only change is unidad_medida.
    if (nombre) {
      const { data: dup } = await supabase
        .from("catalogo_productos")
        .select("id, nombre")
        .ilike("nombre", nombre)
        .neq("id", productoId)
        .maybeSingle()
      if (dup) {
        return NextResponse.json(
          {
            success: false,
            error: `Ya existe un producto con el nombre "${dup.nombre}"`,
          },
          { status: 409 },
        )
      }
    }

    const updates: Record<string, any> = {}
    if (nombre) updates.nombre = nombre
    if (unidad_medida) updates.unidad_medida = unidad_medida

    const { data, error } = await supabase
      .from("catalogo_productos")
      .update(updates)
      .eq("id", productoId)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE /api/inventario/productos/[id]
// Hard-deletes a product. Per business rules, this MUST cascade to all
// transacciones_inventario and inventario_serializado rows so no orphaned
// stock or kardex entries remain. Supabase doesn't have ON DELETE CASCADE
// configured for these tables, so we explicitly run the deletes in order:
//   1. transacciones_inventario  (kardex)
//   2. inventario_serializado    (per-unit rows)
//   3. catalogo_productos        (the product itself)
// If any step fails we surface the error; partial state is unlikely because
// each table is deleted in a single statement.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const productoId = Number(id)
    if (!Number.isFinite(productoId)) {
      return NextResponse.json(
        { success: false, error: "id invalido" },
        { status: 400 },
      )
    }
    const supabase = await getSupabaseServerClient()

    const { error: txErr } = await supabase
      .from("transacciones_inventario")
      .delete()
      .eq("producto_id", productoId)
    if (txErr) throw txErr

    const { error: serErr } = await supabase
      .from("inventario_serializado")
      .delete()
      .eq("producto_id", productoId)
    if (serErr) throw serErr

    const { error: prodErr } = await supabase
      .from("catalogo_productos")
      .delete()
      .eq("id", productoId)
    if (prodErr) throw prodErr

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
