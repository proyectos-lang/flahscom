import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { cuadrilla_id, password } = body

    if (!cuadrilla_id || !password) {
      return NextResponse.json({ error: "Cuadrilla ID y contraseña requeridos" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { data: cuadrilla, error } = await supabase
      .from("cuadrillas")
      .select("id, nombre_cuadrilla, contrasena")
      .eq("id", cuadrilla_id)
      .single()

    if (error || !cuadrilla) {
      return NextResponse.json({ error: "Cuadrilla no encontrada" }, { status: 404 })
    }

    // Verificar contraseña
    const isValid = cuadrilla.contrasena === password

    if (isValid) {
      return NextResponse.json({ 
        success: true, 
        message: "Contraseña correcta" 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        message: "Contraseña incorrecta" 
      }, { status: 401 })
    }
  } catch (error) {
    console.error("[v0] Error verifying password:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
