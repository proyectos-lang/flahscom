import { Card } from "@/components/ui/card"

export default function CuadrillasLoading() {
  return (
    <main className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-9 w-36 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="flex gap-3">
        <div className="h-9 w-72 bg-gray-100 rounded animate-pulse" />
        <div className="h-9 w-40 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
              <div className="space-y-1">
                <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
            </div>
          </Card>
        ))}
      </div>
    </main>
  )
}
