import { Loader2 } from "lucide-react"

// Required as a Suspense fallback for app/rrhh/dotaciones/page.tsx because
// the page (or one of its child components) reads from `useSearchParams()`,
// which Next.js requires to be wrapped in a Suspense boundary during build.
export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      <span className="ml-2 text-sm text-gray-500">Cargando dotaciones...</span>
    </div>
  )
}
