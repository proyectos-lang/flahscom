import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

// GET /api/inventario/stock
// Aggregated stock view used by the Bodega "Catalogo y Stock" tab. For each
// product in the catalog we compute:
//   - For Serializado: count of inventario_serializado rows grouped by
//     ubicacion (Bodega/Cuadrilla/Cliente) AND by estado (Disponible only
//     for Bodega/Cuadrilla, since Instalado lives at Cliente).
//   - For Miscelaneo: sum(cantidad) by ubicacion / cuadrilla.
// We also return the per-cuadrilla breakdown so the Transferencias tab can
// show how much is currently in each cuadrilla without an extra round trip.
export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()

    const [productosRes, serializadosRes, miscRes, cuadrillasRes] =
      await Promise.all([
        supabase
          .from("catalogo_productos")
          .select("id, nombre, tipo, unidad_medida")
          .order("nombre", { ascending: true }),
        supabase
          .from("inventario_serializado")
          .select("producto_id, ubicacion, estado, cuadrilla_id"),
        supabase
          .from("inventario_miscelaneo")
          .select("producto_id, ubicacion, cuadrilla_id, cantidad"),
        supabase
          .from("cuadrillas")
          .select("id, nombre_cuadrilla")
          .eq("activa", true)
          .order("nombre_cuadrilla", { ascending: true }),
      ])

    if (productosRes.error) throw productosRes.error
    if (serializadosRes.error) throw serializadosRes.error
    if (miscRes.error) throw miscRes.error
    if (cuadrillasRes.error) throw cuadrillasRes.error

    const productos = productosRes.data || []
    const seriales = serializadosRes.data || []
    const misc = miscRes.data || []
    const cuadrillas = cuadrillasRes.data || []

    const stock = productos.map((p: any) => {
      if (p.tipo === "Serializado") {
        const filas = seriales.filter((s: any) => s.producto_id === p.id)
        const disponibleBodega = filas.filter(
          (s: any) => s.ubicacion === "Bodega" && s.estado === "Disponible",
        ).length
        const enCuadrilla = filas.filter(
          (s: any) => s.ubicacion === "Cuadrilla" && s.estado === "Disponible",
        ).length
        const instalado = filas.filter((s: any) => s.estado === "Instalado").length
        const defectuoso = filas.filter((s: any) => s.estado === "Defectuoso").length
        const porCuadrilla = cuadrillas.map((c: any) => ({
          cuadrilla_id: c.id,
          nombre_cuadrilla: c.nombre_cuadrilla,
          cantidad: filas.filter(
            (s: any) =>
              s.cuadrilla_id === c.id &&
              s.ubicacion === "Cuadrilla" &&
              s.estado === "Disponible",
          ).length,
        }))
        return {
          ...p,
          bodega: disponibleBodega,
          en_cuadrillas: enCuadrilla,
          instalado,
          defectuoso,
          total: filas.length,
          por_cuadrilla: porCuadrilla,
        }
      }
      // Miscelaneo
      const filas = misc.filter((m: any) => m.producto_id === p.id)
      const bodega = filas
        .filter((m: any) => m.ubicacion === "Bodega")
        .reduce((acc: number, m: any) => acc + Number(m.cantidad || 0), 0)
      const enCuadrillas = filas
        .filter((m: any) => m.ubicacion === "Cuadrilla")
        .reduce((acc: number, m: any) => acc + Number(m.cantidad || 0), 0)
      const porCuadrilla = cuadrillas.map((c: any) => ({
        cuadrilla_id: c.id,
        nombre_cuadrilla: c.nombre_cuadrilla,
        cantidad: filas
          .filter((m: any) => m.cuadrilla_id === c.id && m.ubicacion === "Cuadrilla")
          .reduce((acc: number, m: any) => acc + Number(m.cantidad || 0), 0),
      }))
      return {
        ...p,
        bodega: Number(bodega.toFixed(2)),
        en_cuadrillas: Number(enCuadrillas.toFixed(2)),
        instalado: 0,
        defectuoso: 0,
        total: Number((bodega + enCuadrillas).toFixed(2)),
        por_cuadrilla: porCuadrilla,
      }
    })

    return NextResponse.json({
      success: true,
      data: { productos: stock, cuadrillas },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
