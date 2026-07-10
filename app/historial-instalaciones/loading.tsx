import { Card } from "@/components/ui/card"

export default function HistorialInstalacionesLoading() {
  return (
    <main className="p-4 md:p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-64 bg-gray-200 rounded" />
          <div className="h-4 w-40 bg-gray-200 rounded" />
        </div>
        <div className="h-10 w-72 bg-gray-200 rounded" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-3">
            <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-8 w-12 bg-gray-200 rounded" />
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </Card>
    </main>
  )
}
