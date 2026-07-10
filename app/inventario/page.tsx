"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Warehouse, Package, ArrowLeftRight, History } from "lucide-react"
import { CatalogoStockTab } from "@/components/inventario/catalogo-stock-tab"
import { TransferenciasTab } from "@/components/inventario/transferencias-tab"
import { KardexTab } from "@/components/inventario/kardex-tab"

export default function InventarioPage() {
  const [tab, setTab] = useState("stock")
  // Bumping this number forces children to re-fetch their data after a write,
  // without each tab having to know about the others.
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = () => setRefreshKey((k) => k + 1)

  useEffect(() => {
    // No-op effect kept for future global wiring (eg. realtime channel).
  }, [])

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-gradient-to-br from-orange-400 to-blue-500 rounded-lg">
          <Warehouse className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bodega e Inventario</h1>
          <p className="text-sm text-gray-600">
            Catalogo de productos, stock por ubicacion y trazabilidad de movimientos.
          </p>
        </div>
      </div>

      <Card className="border-2 border-gray-100">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <div className="border-b border-gray-100 px-4 pt-4">
            <TabsList className="bg-gray-50">
              <TabsTrigger value="stock" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Catalogo y Stock</span>
                <span className="sm:hidden">Stock</span>
              </TabsTrigger>
              <TabsTrigger value="transfer" className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                <span className="hidden sm:inline">Transferencias</span>
                <span className="sm:hidden">Transf.</span>
              </TabsTrigger>
              <TabsTrigger value="kardex" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Historial (Kardex)</span>
                <span className="sm:hidden">Kardex</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="stock" className="p-4">
            <CatalogoStockTab
              refreshKey={refreshKey}
              onChange={refresh}
              onGoToTransferencias={() => setTab("transfer")}
            />
          </TabsContent>
          <TabsContent value="transfer" className="p-4">
            <TransferenciasTab refreshKey={refreshKey} onChange={refresh} />
          </TabsContent>
          <TabsContent value="kardex" className="p-4">
            <KardexTab refreshKey={refreshKey} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
