"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Hash, Boxes, RefreshCw, Send, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface SerialItem {
  id: number
  producto_id: number
  numero_serie: string
  estado: string
  fecha_ingreso: string
  producto: { nombre: string; tipo: string; unidad_medida: string | null } | null
}
interface MiscItem {
  id: number
  producto_id: number
  cantidad: number
  producto: { nombre: string; tipo: string; unidad_medida: string | null } | null
}
interface CuadrillaOpt {
  id: number
  nombre_cuadrilla: string
}

// The item currently being transferred to another cuadrilla.
type TransferTarget =
  | { tipo: "Serializado"; serial: SerialItem }
  | { tipo: "Miscelaneo"; misc: MiscItem }
  | null

export function MiInventarioDialog({
  open,
  onOpenChange,
  cuadrillaId,
  cuadrillaName,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  cuadrillaId: number | null
  cuadrillaName: string
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [seriales, setSeriales] = useState<SerialItem[]>([])
  const [misc, setMisc] = useState<MiscItem[]>([])
  const [search, setSearch] = useState("")

  // Transfer-to-another-cuadrilla state.
  const [cuadrillas, setCuadrillas] = useState<CuadrillaOpt[]>([])
  const [transferTarget, setTransferTarget] = useState<TransferTarget>(null)
  const [destinoId, setDestinoId] = useState<string>("")
  const [cantTransfer, setCantTransfer] = useState<string>("1")
  const [transferring, setTransferring] = useState(false)

  const load = async () => {
    if (!cuadrillaId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/inventario/mi-stock?cuadrilla_id=${cuadrillaId}`)
      const json = await res.json()
      if (json.success) {
        setSeriales(json.data.seriales || [])
        setMisc(json.data.miscelaneo || [])
      }
    } finally {
      setLoading(false)
    }
  }

  // Load the list of destination cuadrillas (excluding the technician's own).
  const loadCuadrillas = async () => {
    try {
      const res = await fetch("/api/cuadrillas?activa=true")
      const json = await res.json()
      if (json.success) setCuadrillas(json.data || [])
    } catch {
      // Non-blocking: the transfer selector will simply be empty.
    }
  }

  useEffect(() => {
    if (open) {
      load()
      loadCuadrillas()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cuadrillaId])

  const q = search.trim().toLowerCase()
  const serFiltered = seriales.filter(
    (s) =>
      !q ||
      s.numero_serie.toLowerCase().includes(q) ||
      s.producto?.nombre.toLowerCase().includes(q),
  )
  const miscFiltered = misc.filter(
    (m) => !q || m.producto?.nombre.toLowerCase().includes(q),
  )

  const openTransfer = (target: TransferTarget) => {
    setTransferTarget(target)
    setDestinoId("")
    setCantTransfer("1")
  }

  const destinos = cuadrillas.filter((c) => c.id !== cuadrillaId)

  const handleTransfer = async () => {
    if (!transferTarget || !cuadrillaId) return
    if (!destinoId) {
      toast({ title: "Selecciona la cuadrilla de destino", variant: "destructive" })
      return
    }

    const body: any = {
      direccion: "Cuadrilla_A_Cuadrilla",
      cuadrilla_id: cuadrillaId,
      cuadrilla_destino_id: Number(destinoId),
      usuario_registro: cuadrillaName || "tecnico",
      observaciones: `Transferencia desde ${cuadrillaName}`,
    }

    if (transferTarget.tipo === "Serializado") {
      body.producto_id = transferTarget.serial.producto_id
      body.serial_ids = [transferTarget.serial.id]
    } else {
      const cant = Number(cantTransfer)
      if (!Number.isFinite(cant) || cant <= 0) {
        toast({ title: "La cantidad debe ser mayor a 0", variant: "destructive" })
        return
      }
      if (cant > transferTarget.misc.cantidad) {
        toast({
          title: "Cantidad insuficiente",
          description: `Solo tienes ${transferTarget.misc.cantidad} disponibles.`,
          variant: "destructive",
        })
        return
      }
      body.producto_id = transferTarget.misc.producto_id
      body.cantidad = cant
    }

    setTransferring(true)
    try {
      const res = await fetch("/api/inventario/transferencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "No se pudo realizar la transferencia")
      }
      const destinoNombre =
        destinos.find((c) => c.id === Number(destinoId))?.nombre_cuadrilla || "la cuadrilla"
      toast({
        title: "Transferencia realizada",
        description: `Material enviado a ${destinoNombre}.`,
      })
      setTransferTarget(null)
      await load()
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "No se pudo realizar la transferencia",
        variant: "destructive",
      })
    } finally {
      setTransferring(false)
    }
  }

  const targetNombre =
    transferTarget?.tipo === "Serializado"
      ? transferTarget.serial.producto?.nombre
      : transferTarget?.tipo === "Miscelaneo"
        ? transferTarget.misc.producto?.nombre
        : ""

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span>
                Mi Inventario
                <span className="block text-xs font-normal text-gray-500">
                  {cuadrillaName}
                </span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={load}
                disabled={loading}
                className="font-normal"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`}
                />
                Actualizar
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Buscar por nombre o serie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Tabs defaultValue="seriales" className="w-full">
              <TabsList>
                <TabsTrigger value="seriales" className="flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5" />
                  Equipos ({seriales.length})
                </TabsTrigger>
                <TabsTrigger value="misc" className="flex items-center gap-1">
                  <Boxes className="w-3.5 h-3.5" />
                  Materiales ({misc.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="seriales">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                  </div>
                ) : serFiltered.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-6">
                    No tienes equipos asignados.
                  </p>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 rounded-lg border border-gray-100">
                    {serFiltered.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-2 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {s.producto?.nombre || "Producto"}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            SN: {s.numero_serie}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant="outline"
                            className="border-emerald-200 text-emerald-700 bg-emerald-50"
                          >
                            {s.estado}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => openTransfer({ tipo: "Serializado", serial: s })}
                          >
                            <Send className="w-3 h-3" />
                            Transferir
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="misc">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                  </div>
                ) : miscFiltered.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-6">
                    No tienes materiales asignados.
                  </p>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 rounded-lg border border-gray-100">
                    {miscFiltered.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-2 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {m.producto?.nombre || "Producto"}
                          </p>
                          <p className="text-xs text-gray-500">
                            Unidad: {m.producto?.unidad_medida || "Unidad"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-base font-semibold text-gray-900">
                            {m.cantidad}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => openTransfer({ tipo: "Miscelaneo", misc: m })}
                          >
                            <Send className="w-3 h-3" />
                            Transferir
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer-to-another-cuadrilla dialog */}
      <Dialog
        open={transferTarget !== null}
        onOpenChange={(v) => !v && setTransferTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4 text-orange-500" />
              Transferir a otra cuadrilla
            </DialogTitle>
            <DialogDescription className="text-xs">
              El material saldra de tu inventario y quedara asignado a la cuadrilla de destino.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="text-sm font-medium text-gray-900">{targetNombre || "Producto"}</p>
              {transferTarget?.tipo === "Serializado" ? (
                <p className="text-xs text-gray-500 font-mono">
                  SN: {transferTarget.serial.numero_serie}
                </p>
              ) : transferTarget?.tipo === "Miscelaneo" ? (
                <p className="text-xs text-gray-500">
                  Disponible: {transferTarget.misc.cantidad}{" "}
                  {transferTarget.misc.producto?.unidad_medida || ""}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <span className="font-medium text-gray-700">{cuadrillaName}</span>
              <ArrowRight className="w-4 h-4" />
              <span className="font-medium text-gray-700">Destino</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Cuadrilla destino</Label>
              <Select value={destinoId} onValueChange={setDestinoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cuadrilla" />
                </SelectTrigger>
                <SelectContent>
                  {destinos.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre_cuadrilla}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {transferTarget?.tipo === "Miscelaneo" && (
              <div className="space-y-1.5">
                <Label className="text-sm">Cantidad a transferir</Label>
                <Input
                  type="number"
                  min={1}
                  max={transferTarget.misc.cantidad}
                  value={cantTransfer}
                  onChange={(e) => setCantTransfer(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTransferTarget(null)}
              disabled={transferring}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={transferring || !destinoId}
              className="bg-orange-500 hover:bg-orange-600 gap-2"
            >
              {transferring ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
