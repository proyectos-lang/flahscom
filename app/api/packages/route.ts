import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
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

    const body = await request.json()
    const { nombre, velocidad, tecnologia, precio_mensual, activo } = body

    // The table's id sequence is out of sync with existing rows, so letting
    // Postgres assign the id can collide with an existing key. We compute the
    // next id from the current max and insert it explicitly, retrying a few
    // times in case another insert grabbed the same id first.
    let lastError: { message: string } | null = null
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: maxRow } = await supabase
        .from("paquetes")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextId = (maxRow?.id ?? 0) + 1 + attempt

      const { data, error } = await supabase
        .from("paquetes")
        .insert([{ id: nextId, nombre, velocidad, tecnologia, precio_mensual, activo: activo ?? true }])
        .select()

      if (!error) {
        return NextResponse.json({ package: data[0] })
      }

      // 23505 = duplicate key; retry with a higher id. Any other error is fatal.
      if (error.code !== "23505") {
        console.error("[v0] Error creating package:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      lastError = error
      console.log("[v0] Duplicate id, retrying with higher id. Attempt:", attempt + 1)
    }

    console.error("[v0] Error creating package after retries:", lastError)
    return NextResponse.json({ error: lastError?.message || "No se pudo crear el paquete" }, { status: 500 })
  } catch (error) {
    console.error("[v0] Error in POST packages:", error)
    return NextResponse.json({ error: "Error al crear paquete" }, { status: 500 })
  }
}

export async function GET() {
  console.log("[v0] Packages API route called")

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

    console.log("[v0] Querying paquetes table...")
    const { data, error } = await supabase.from("paquetes").select("*").order("precio_mensual", { ascending: true })

    if (error) {
      console.error("[v0] Error loading packages from DB:", error)
      return NextResponse.json({ error: "Error al cargar paquetes" }, { status: 500 })
    }

    console.log("[v0] Packages loaded successfully:", data?.length, "packages")
    return NextResponse.json({ packages: data })
  } catch (error) {
    console.error("[v0] Error in packages API route:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
