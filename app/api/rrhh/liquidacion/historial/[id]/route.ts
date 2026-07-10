import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// DELETE - Remove a nomina and all its related periodos_nomina records.
// Two-step delete because there is no ON DELETE CASCADE constraint configured:
//   1. Delete child rows in `periodos_nomina` matching nomina_id.
//   2. Delete the master row in `nominas`.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const nominaId = Number(id)

    if (!nominaId || Number.isNaN(nominaId)) {
      return NextResponse.json(
        { success: false, error: "ID de nomina invalido" },
        { status: 400 },
      )
    }

    // Step 1: delete child records (detalle por empleado)
    const { error: periodosError } = await supabase
      .from("periodos_nomina")
      .delete()
      .eq("nomina_id", nominaId)

    if (periodosError) {
      console.error("[v0] Error deleting periodos_nomina:", periodosError)
      return NextResponse.json(
        { success: false, error: periodosError.message },
        { status: 500 },
      )
    }

    // Step 2: delete the master nomina row
    const { error: nominaError } = await supabase
      .from("nominas")
      .delete()
      .eq("id", nominaId)

    if (nominaError) {
      console.error("[v0] Error deleting nomina:", nominaError)
      return NextResponse.json(
        { success: false, error: nominaError.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Unexpected error deleting nomina:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Error interno" },
      { status: 500 },
    )
  }
}
