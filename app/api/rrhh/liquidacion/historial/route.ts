import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch nominas history or periodos for a specific nomina
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nominaId = searchParams.get("nomina_id")

    // If nomina_id is provided, fetch periodos for that nomina with employee names
    if (nominaId) {
      const { data: periodos, error: periodosError } = await supabase
        .from("periodos_nomina")
        .select("*")
        .eq("nomina_id", nominaId)
        .order("id", { ascending: true })

      if (periodosError) {
        console.error("Error fetching periodos:", periodosError)
        return NextResponse.json({ error: periodosError.message }, { status: 500 })
      }

      // Get employee names for each periodo
      if (periodos && periodos.length > 0) {
        const empleadoIds = [...new Set(periodos.map(p => p.empleado_id))]
        
        const { data: empleados } = await supabase
          .from("empleados")
          .select("id, nombre_completo, empresa")
          .in("id", empleadoIds)

        const empleadosMap = new Map(empleados?.map(e => [e.id, e]) || [])

        const periodosConNombres = periodos.map(p => ({
          ...p,
          nombre_completo: empleadosMap.get(p.empleado_id)?.nombre_completo || null,
          empresa: empleadosMap.get(p.empleado_id)?.empresa || null,
        }))

        return NextResponse.json({ success: true, data: periodosConNombres })
      }

      return NextResponse.json({ success: true, data: periodos || [] })
    }

    // Otherwise, fetch all nominas (master records)
    const { data: nominas, error: nominasError } = await supabase
      .from("nominas")
      .select("*")
      .order("created_at", { ascending: false })

    if (nominasError) {
      console.error("Error fetching nominas:", nominasError)
      return NextResponse.json({ success: false, error: nominasError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: nominas || [] })
  } catch (error) {
    console.error("Error in historial GET:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
