import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function DailyDashboardLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Date Filter Skeleton */}
        <Card className="p-4 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="w-full sm:w-48 h-10" />
            <Skeleton className="w-full sm:w-24 h-10" />
          </div>
        </Card>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Ventas Card Skeleton */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 shadow-md">
            <div className="flex items-start justify-between">
              <div className="space-y-2 w-full">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-20" />
                <div className="mt-2 p-2 bg-white/60 rounded">
                  <Skeleton className="h-3 w-32 mb-2" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
              <Skeleton className="w-12 h-12 rounded-full" />
            </div>
          </Card>

          {/* Pagos Card Skeleton */}
          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 shadow-md">
            <div className="flex items-start justify-between">
              <div className="space-y-2 w-full">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-20" />
                <div className="mt-2 p-2 bg-white/60 rounded">
                  <Skeleton className="h-3 w-32 mb-2" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
              <Skeleton className="w-12 h-12 rounded-full" />
            </div>
          </Card>
        </div>

        {/* Table Skeleton */}
        <Card className="p-4">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
      </div>
    </main>
  )
}
