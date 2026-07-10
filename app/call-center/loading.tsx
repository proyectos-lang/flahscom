import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto" />
        <p className="text-sm text-gray-600">Cargando Call Center...</p>
      </div>
    </div>
  )
}
