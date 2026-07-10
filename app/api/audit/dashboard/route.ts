import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get("mes") || new Date().toISOString().slice(0, 7)

    const [year, month] = mes.split("-")
    const startDate = `${year}-${month}-01`
    const lastDay = new Date(Number.parseInt(year), Number.parseInt(month), 0).getDate()
    const endDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}`

    // Get all contracts for the month
    const { data: contratos, error } = await supabase
      .from("contratos")
      .select("*")
      .gte("fecha_contratacion", startDate)
      .lte("fecha_contratacion", endDate)
      .order("id", { ascending: false })

    if (error) {
      console.error("Error fetching contracts for dashboard:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const allContracts = contratos || []

    // Get related data
    const vendedorIds = [...new Set(allContracts.map(c => c.vendedor_id).filter(Boolean))]
    const paqueteIds = [...new Set(allContracts.map(c => c.paquete_id).filter(Boolean))]
    const clienteIds = [...new Set(allContracts.map(c => c.cliente_id).filter(Boolean))]

    const { data: vendedores } = await supabase.from("vendedores").select("*").in("id", vendedorIds.length > 0 ? vendedorIds : [0])
    const { data: paquetes } = await supabase.from("paquetes").select("*").in("id", paqueteIds.length > 0 ? paqueteIds : [0])
    const { data: clientes } = await supabase.from("clientes").select("*").in("id", clienteIds.length > 0 ? clienteIds : [0])

    const vendedoresMap = new Map((vendedores || []).map((v: any) => [v.id, v]))
    const paquetesMap = new Map((paquetes || []).map((p: any) => [p.id, p]))
    const clientesMap = new Map((clientes || []).map((c: any) => [c.id, c]))

    // Calculate summary metrics
    const totalContratos = allContracts.length
    const pendientes = allContracts.filter(c => c.estado_auditoria === "pendiente").length
    const aprobados = allContracts.filter(c => c.estado_auditoria === "aprobada").length
    const rechazados = allContracts.filter(c => c.estado_auditoria === "rechazada").length
    const totalVendido = allContracts
      .filter(c => c.estado_auditoria === "aprobada")
      .reduce((sum, c) => sum + Number(c.valor_paquete || 0), 0)
    const totalPendienteValor = allContracts
      .filter(c => c.estado_auditoria === "pendiente")
      .reduce((sum, c) => sum + Number(c.valor_paquete || 0), 0)

    // Sales by day
    const porDia: Record<string, { fecha: string; total: number; aprobados: number; pendientes: number; rechazados: number; valor: number }> = {}
    
    // Initialize all days of the month
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${year}-${month}-${String(d).padStart(2, "0")}`
      porDia[dateStr] = { fecha: dateStr, total: 0, aprobados: 0, pendientes: 0, rechazados: 0, valor: 0 }
    }

    allContracts.forEach(c => {
      const fecha = c.fecha_contratacion?.split("T")[0]
      if (fecha && porDia[fecha]) {
        porDia[fecha].total++
        if (c.estado_auditoria === "aprobada") {
          porDia[fecha].aprobados++
          porDia[fecha].valor += Number(c.valor_paquete || 0)
        } else if (c.estado_auditoria === "pendiente") {
          porDia[fecha].pendientes++
        } else if (c.estado_auditoria === "rechazada") {
          porDia[fecha].rechazados++
        }
      }
    })

    // Sales by seller
    const vendedorStats: Record<number, { 
      id: number
      nombre: string
      total: number
      aprobados: number
      pendientes: number
      rechazados: number
      valorTotal: number
    }> = {}

    allContracts.forEach(c => {
      const vendedorId = c.vendedor_id || 0
      const vendedor = vendedoresMap.get(vendedorId)
      const vendedorNombre = vendedor?.nombre || "Sin vendedor"
      
      if (!vendedorStats[vendedorId]) {
        vendedorStats[vendedorId] = {
          id: vendedorId,
          nombre: vendedorNombre,
          total: 0,
          aprobados: 0,
          pendientes: 0,
          rechazados: 0,
          valorTotal: 0,
        }
      }
      
      vendedorStats[vendedorId].total++
      if (c.estado_auditoria === "aprobada") {
        vendedorStats[vendedorId].aprobados++
        vendedorStats[vendedorId].valorTotal += Number(c.valor_paquete || 0)
      } else if (c.estado_auditoria === "pendiente") {
        vendedorStats[vendedorId].pendientes++
      } else if (c.estado_auditoria === "rechazada") {
        vendedorStats[vendedorId].rechazados++
      }
    })

    // Sales by package (only approved)
    const paqueteStats: Record<number, {
      id: number
      nombre: string
      megas: number
      precio: number
      cantidad: number
      valorTotal: number
    }> = {}

    allContracts.filter(c => c.estado_auditoria === "aprobada").forEach(c => {
      const paqueteId = c.paquete_id || 0
      const paquete = paquetesMap.get(paqueteId)
      
      if (!paqueteStats[paqueteId]) {
        paqueteStats[paqueteId] = {
          id: paqueteId,
          nombre: paquete?.nombre || "Paquete desconocido",
          megas: paquete?.megas || 0,
          precio: paquete?.precio_mensual || Number(c.valor_paquete) || 0,
          cantidad: 0,
          valorTotal: 0,
        }
      }
      
      paqueteStats[paqueteId].cantidad++
      paqueteStats[paqueteId].valorTotal += Number(c.valor_paquete || 0)
    })

    // Recent activity
    const actividadReciente = allContracts.slice(0, 25).map(c => {
      const cliente = clientesMap.get(c.cliente_id)
      const vendedor = vendedoresMap.get(c.vendedor_id)
      const paquete = paquetesMap.get(c.paquete_id)
      
      return {
        tipo: (c.estado_auditoria || "pendiente") as "pendiente" | "aprobada" | "rechazada",
        contrato_id: c.id,
        cliente: cliente?.nombre_completo || "Cliente",
        vendedor: vendedor?.nombre || "Vendedor",
        paquete: paquete?.nombre || "Paquete",
        megas: paquete?.megas || 0,
        valor: Number(c.valor_paquete || 0),
        fecha: c.fecha_contratacion?.split("T")[0] || "",
        hora: c.fecha_contratacion ? new Date(c.fecha_contratacion).toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" }) : "",
      }
    })

    return NextResponse.json({
      success: true,
      mes,
      resumen: {
        totalContratos,
        pendientes,
        aprobados,
        rechazados,
        totalVendido,
        totalPendienteValor,
        tasaAprobacion: totalContratos > 0 ? Math.round((aprobados / totalContratos) * 100) : 0,
      },
      porDia: Object.values(porDia).sort((a, b) => a.fecha.localeCompare(b.fecha)),
      porVendedor: Object.values(vendedorStats).sort((a, b) => b.aprobados - a.aprobados),
      porPaquete: Object.values(paqueteStats).sort((a, b) => b.cantidad - a.cantidad),
      actividadReciente,
    })
  } catch (error) {
    console.error("Unexpected error in audit dashboard:", error)
    return NextResponse.json({ success: false, error: "Error al cargar dashboard" }, { status: 500 })
  }
}
