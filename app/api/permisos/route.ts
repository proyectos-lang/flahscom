import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()

    // Get all permisos with user info from perfiles
    const { data: permisos, error: permisosError } = await supabase
      .from("permisos")
      .select("*")
      .order("id", { ascending: true })

    if (permisosError) {
      console.error("[v0] Error fetching permisos:", permisosError)
      return NextResponse.json({ error: "Error al obtener permisos" }, { status: 500 })
    }

    // Get all perfiles to match with permisos
    const { data: perfiles, error: perfilesError } = await supabase.from("perfiles").select("*")

    if (perfilesError) {
      console.error("[v0] Error fetching perfiles:", perfilesError)
      return NextResponse.json({ error: "Error al obtener perfiles" }, { status: 500 })
    }

    // Join permisos with perfiles by auth_user_id
    const permisosWithNames = permisos?.map((permiso) => {
      const perfil = perfiles?.find((p) => p.auth_user_id === permiso.auth_user_id)
      return {
        ...permiso,
        nombre: perfil?.nombre || "Usuario desconocido",
      }
    })

    return NextResponse.json(permisosWithNames || [])
  } catch (error) {
    console.error("[v0] Error in GET permisos:", error)
    return NextResponse.json({ error: "Error al procesar solicitud" }, { status: 500 })
  }
}
