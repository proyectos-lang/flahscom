"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, FileText, ImageIcon, MapPin, Calendar, DollarSign, User } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface Installation {
  id: string
  clientName: string
  address: string
  planType: string
  monthlyFee: number
  installationDate: string
  vendorName: string
  documents: {
    identityFront: boolean
    identityBack: boolean
    contract: boolean
    installationPhoto: boolean
    housePhoto: boolean
  }
}

interface InstallationReviewCardProps {
  installation: Installation
}

export function InstallationReviewCard({ installation }: InstallationReviewCardProps) {
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve")
  const [comments, setComments] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleReview = (action: "approve" | "reject") => {
    setReviewAction(action)
    setShowReviewDialog(true)
  }

  const handleSubmitReview = async () => {
    setIsSubmitting(true)
    // TODO: Implement actual submission when Supabase is connected
    setTimeout(() => {
      toast({
        title: reviewAction === "approve" ? "Instalación aprobada" : "Instalación rechazada",
        description:
          reviewAction === "approve"
            ? "La instalación ha sido aprobada exitosamente"
            : "La instalación ha sido rechazada",
      })
      setIsSubmitting(false)
      setShowReviewDialog(false)
      setComments("")
    }, 1500)
  }

  const totalDocuments = Object.keys(installation.documents).length
  const uploadedDocuments = Object.values(installation.documents).filter(Boolean).length

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">{installation.clientName}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {installation.address}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Pendiente
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Fecha</p>
                <p className="text-sm font-medium">{new Date(installation.installationDate).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Plan</p>
                <p className="text-sm font-medium">{installation.planType}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Tarifa mensual</p>
                <p className="text-sm font-medium">L {installation.monthlyFee.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Vendedor</p>
                <p className="text-sm font-medium">{installation.vendorName}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Documentos</p>
              <Badge variant="outline">
                {uploadedDocuments} de {totalDocuments}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <DocumentStatus label="ID Frente" uploaded={installation.documents.identityFront} />
              <DocumentStatus label="ID Reverso" uploaded={installation.documents.identityBack} />
              <DocumentStatus label="Contrato" uploaded={installation.documents.contract} />
              <DocumentStatus label="Instalación" uploaded={installation.documents.installationPhoto} />
              <DocumentStatus label="Casa" uploaded={installation.documents.housePhoto} />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => handleReview("approve")}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Aprobar
            </Button>
            <Button onClick={() => handleReview("reject")} variant="destructive" className="flex-1">
              <XCircle className="w-4 h-4 mr-2" />
              Rechazar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewAction === "approve" ? "Aprobar instalación" : "Rechazar instalación"}</DialogTitle>
            <DialogDescription>
              {reviewAction === "approve"
                ? "¿Estás seguro de aprobar esta instalación?"
                : "¿Estás seguro de rechazar esta instalación?"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comments">Comentarios {reviewAction === "reject" ? "*" : "(opcional)"}</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  reviewAction === "approve"
                    ? "Agrega comentarios adicionales sobre la aprobación"
                    : "Explica el motivo del rechazo"
                }
                rows={4}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowReviewDialog(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmitting || (reviewAction === "reject" && !comments)}
              className={`flex-1 ${reviewAction === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
            >
              {isSubmitting
                ? "Procesando..."
                : reviewAction === "approve"
                  ? "Confirmar aprobación"
                  : "Confirmar rechazo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface DocumentStatusProps {
  label: string
  uploaded: boolean
}

function DocumentStatus({ label, uploaded }: DocumentStatusProps) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-md border ${uploaded ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}
    >
      {uploaded ? <ImageIcon className="w-4 h-4 text-green-600" /> : <FileText className="w-4 h-4 text-gray-400" />}
      <span className={`text-xs ${uploaded ? "text-green-700 font-medium" : "text-gray-500"}`}>{label}</span>
    </div>
  )
}
