import { Card } from "@/components/ui/card"

export default function TecnicoLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 space-y-4 max-w-lg mx-auto animate-pulse">
      <div className="space-y-2">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 border-l-4 border-l-gray-200">
            <div className="space-y-2">
              <div className="h-4 w-40 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
            </div>
          </Card>
        ))}
      </div>
    </main>
  )
}
