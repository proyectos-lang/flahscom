import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        db: {
          schema: "public",
        },
      },
    )

    const { id } = await params
    const body = await request.json()
    const { nombre, velocidad, tecnologia, precio_mensual, activo } = body

    const { data, error } = await supabase
      .from("paquetes")
      .update({ nombre, velocidad, tecnologia, precio_mensual, activo })
      .eq("id", Number.parseInt(id))
      .select()

    if (error) {
      console.error("[v0] Error updating package:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ package: data[0] })
  } catch (error) {
    console.error("[v0] Error in PUT package:", error)
    return NextResponse.json({ error: "Error al actualizar paquete" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        db: {
          schema: "public",
        },
      },
    )

    const { id } = await params

    const { error } = await supabase.from("paquetes").delete().eq("id", Number.parseInt(id))

    if (error) {
      console.error("[v0] Error deleting package:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in DELETE package:", error)
    return NextResponse.json({ error: "Error al eliminar paquete" }, { status: 500 })
  }
}
