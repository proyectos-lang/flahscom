import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()

    const { data: perfiles, error: perfilesError } = await supabase
      .from("perfiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (perfilesError) {
      console.error("[v0] Error fetching perfiles:", perfilesError)
      return NextResponse.json({ error: perfilesError.message }, { status: 400 })
    }

    return NextResponse.json(perfiles || [])
  } catch (error: any) {
    console.error("[v0] Error in usuarios GET:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, nombre, rol } = body

    console.log("[v0] Creating user:", { username, nombre, rol })

    if (!username || !password || !nombre || !rol) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    const email = `${username}@sid.app`
    console.log("[v0] Email to create:", email)

    console.log("[v0] Calling Supabase Admin API...")
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true, // Auto-confirmar usuario
        user_metadata: {
          nombre,
          rol,
        },
      }),
    })

    console.log("[v0] Auth response status:", authResponse.status)

    if (!authResponse.ok) {
      const errorData = await authResponse.json()
      console.error("[v0] Error creating auth user:", errorData)
      return NextResponse.json(
        { error: errorData.message || "Error al crear usuario en Authentication" },
        { status: authResponse.status },
      )
    }

    const authUser = await authResponse.json()
    const authUserId = authUser.id

    console.log("[v0] Auth user created with ID:", authUserId)

    const supabase = await getSupabaseServerClient()
    const { data: perfil, error: perfilError } = await supabase
      .from("perfiles")
      .insert([
        {
          auth_user_id: authUserId,
          nombre,
          rol,
        },
      ])
      .select()
      .single()

    if (perfilError) {
      console.error("[v0] Error creating perfil:", perfilError)

      // Rollback: eliminar el usuario de auth si falla la creación del perfil
      console.log("[v0] Rolling back auth user...")
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUserId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
      })

      return NextResponse.json({ error: perfilError.message }, { status: 400 })
    }

    console.log("[v0] Perfil created successfully")

    const { error: permisosError } = await supabase.from("permisos").insert([
      {
        auth_user_id: authUserId,
        dashboard: false,
        ventas: false,
        auditoria: false,
        cartera: false,
        cobros: false,
        vendedores: false,
        paquetes: false,
        mapa: false,
        historial_pagos: false,
        instalaciones: false,
        usuarios: false,
        permisos: false,
      },
    ])

    if (permisosError) {
      console.error("[v0] Error creating permisos:", permisosError)
      // No hacer rollback completo, solo advertir
      console.log("[v0] Warning: User created but permissions not initialized")
    } else {
      console.log("[v0] Permisos created successfully")
    }

    return NextResponse.json({
      success: true,
      user: perfil,
      email,
    })
  } catch (error: any) {
    console.error("[v0] Error in usuarios POST:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
