import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

// PATCH /api/inventario/seriales/[id]
// Allows editing the numero_serie of a single serialized unit. Other fields
// (estado, ubicacion, cuadrilla_id) are managed exclusively by the transfer /
// dispatch / return flows and must not be mutated here, otherwise the stock
// invariants the kardex relies on would silently break.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const serialId = Number(id)
    if (!Number.isFinite(serialId)) {
      return NextResponse.json(
        { success: false, error: "id invalido" },
        { status: 400 },
      )
    }
    const body = await request.json()
    const numero_serie =
      typeof body.numero_serie === "string" ? body.numero_serie.trim() : ""
    if (!numero_serie) {
      return NextResponse.json(
        { success: false, error: "numero_serie requerido" },
        { status: 400 },
      )
    }

    const supabase = await getSupabaseServerClient()

    // Look up the producto_id of this serial so we can scope the duplicate
    // check to the same product (different products are allowed to reuse a
    // serial string).
    const { data: current, error: curErr } = await supabase
      .from("inventario_serializado")
      .select("id, producto_id, numero_serie")
      .eq("id", serialId)
      .single()
    if (curErr) throw curErr
    if (!current) {
      return NextResponse.json(
        { success: false, error: "Serial no encontrado" },
        { status: 404 },
      )
    }

    if (current.numero_serie !== numero_serie) {
      const { data: dup } = await supabase
        .from("inventario_serializado")
        .select("id")
        .eq("producto_id", current.producto_id)
        .eq("numero_serie", numero_serie)
        .neq("id", serialId)
        .maybeSingle()
      if (dup) {
        return NextResponse.json(
          {
            success: false,
            error: `Ya existe un serial "${numero_serie}" para este producto`,
          },
          { status: 409 },
        )
      }
    }

    const { data, error } = await supabase
      .from("inventario_serializado")
      .update({ numero_serie })
      .eq("id", serialId)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE /api/inventario/seriales/[id]
// Permanently removes a single serialized unit. Mirrors the cascade applied
// when a product is deleted: all kardex rows that reference this serial are
// wiped first so we don't leave orphaned transactions pointing at a missing
// serial_id. The aggregate stock view (productos.bodega / en_cuadrillas /
// instalado / defectuoso) is recomputed by the existing stock endpoint based
// on the serializado table, so removing the serial is enough to keep counts
// consistent.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const serialId = Number(id)
    if (!Number.isFinite(serialId)) {
      return NextResponse.json(
        { success: false, error: "id invalido" },
        { status: 400 },
      )
    }

    const supabase = await getSupabaseServerClient()

    // Confirm the serial exists before deleting so we can return 404 instead
    // of silently succeeding on a no-op.
    const { data: current, error: curErr } = await supabase
      .from("inventario_serializado")
      .select("id, numero_serie, estado")
      .eq("id", serialId)
      .single()
    if (curErr) throw curErr
    if (!current) {
      return NextResponse.json(
        { success: false, error: "Serial no encontrado" },
        { status: 404 },
      )
    }

    // 1) Drop kardex rows that reference this serial.
    const { error: kardexErr } = await supabase
      .from("transacciones_inventario")
      .delete()
      .eq("serial_id", serialId)
    if (kardexErr) throw kardexErr

    // 2) Drop the serial row itself.
    const { error: delErr } = await supabase
      .from("inventario_serializado")
      .delete()
      .eq("id", serialId)
    if (delErr) throw delErr

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
