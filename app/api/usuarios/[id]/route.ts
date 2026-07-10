import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()

    // Obtener el auth_user_id antes de eliminar el perfil
    const { data: perfil, error: fetchError } = await supabase
      .from("perfiles")
      .select("auth_user_id")
      .eq("id", Number.parseInt(id))
      .single()

    if (fetchError || !perfil) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const authUserId = perfil.auth_user_id

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: "Missing Supabase credentials" }, { status: 500 })
    }

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUserId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    })

    if (!authResponse.ok) {
      const errorData = await authResponse.json()
      console.error("[v0] Error deleting auth user:", errorData)
    }

    // Eliminar perfil de la base de datos
    const { error } = await supabase.from("perfiles").delete().eq("id", Number.parseInt(id))

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error deleting usuario:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
