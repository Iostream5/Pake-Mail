import * as React from "react"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={className}
      {...props}
    />
  )
}

export { Skeleton }

export function DashboardSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-10 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-ash-stroke pb-8">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-ash-stroke" />
            <div className="h-4 w-32 bg-ash-stroke rounded" />
          </div>
          <div className="h-10 w-80 bg-carbon-lift rounded" />
          <div className="h-4 w-11/12 bg-ash-stroke rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-36 bg-carbon-lift rounded" />
          <div className="h-10 w-32 bg-carbon-lift rounded" />
        </div>
      </div>

      {/* Metrics Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-ash-stroke bg-carbon-lift p-5 rounded-[10px] h-28 flex flex-col justify-between">
            <div className="h-3 w-28 bg-ash-stroke rounded" />
            <div className="flex justify-between items-end">
              <div className="h-8 w-16 bg-ash-stroke rounded" />
              <div className="h-3 w-20 bg-ash-stroke rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 w-48 bg-carbon-lift rounded" />
              <div className="h-3.5 w-60 bg-ash-stroke rounded" />
            </div>
            <div className="h-8 w-28 bg-carbon-lift rounded" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-ash-stroke bg-carbon-lift p-5 rounded-[10px] h-20 flex justify-between items-center">
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-ash-stroke rounded" />
                  <div className="h-3 w-64 bg-ash-stroke rounded" />
                </div>
                <div className="h-8 w-8 bg-ash-stroke rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 w-48 bg-carbon-lift rounded" />
              <div className="h-3.5 w-44 bg-ash-stroke rounded" />
            </div>
            <div className="h-8 w-28 bg-carbon-lift rounded" />
          </div>
          <div className="border border-ash-stroke bg-carbon-lift rounded-[10px] divide-y divide-ash-stroke">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 flex justify-between items-center h-16">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-ash-stroke rounded" />
                  <div className="h-3 w-24 bg-ash-stroke rounded" />
                </div>
                <div className="space-y-2 flex flex-col items-end">
                  <div className="h-5 w-16 bg-ash-stroke rounded" />
                  <div className="h-3 w-12 bg-ash-stroke rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function RecipientsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Filter Header Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-ash-stroke pb-4">
        <div className="h-10 w-full sm:max-w-md bg-carbon-lift rounded" />
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-carbon-lift rounded" />
          <div className="h-10 w-28 bg-carbon-lift rounded" />
          <div className="h-10 w-36 bg-carbon-lift rounded" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="hidden sm:block border border-ash-stroke bg-carbon-lift rounded-[10px] overflow-hidden">
        <div className="border-b border-ash-stroke bg-obsidian-canvas/50 px-4 py-3 h-10 flex justify-between items-center">
          <div className="h-3 w-32 bg-ash-stroke rounded" />
          <div className="h-3 w-40 bg-ash-stroke rounded" />
          <div className="h-3 w-28 bg-ash-stroke rounded" />
          <div className="h-3 w-24 bg-ash-stroke rounded" />
          <div className="h-3 w-20 bg-ash-stroke rounded" />
        </div>
        <div className="divide-y divide-ash-stroke">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 py-4 h-14 flex justify-between items-center">
              <div className="h-4 w-32 bg-ash-stroke rounded" />
              <div className="h-4 w-40 bg-ash-stroke rounded" />
              <div className="h-4 w-28 bg-ash-stroke rounded" />
              <div className="h-4 w-24 bg-ash-stroke rounded" />
              <div className="h-5 w-16 bg-ash-stroke rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Cards Skeleton */}
      <div className="space-y-3 sm:hidden">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-ash-stroke bg-carbon-lift p-4 rounded-[10px] space-y-3">
            <div className="flex justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-ash-stroke rounded" />
                <div className="h-3.5 w-40 bg-ash-stroke rounded" />
              </div>
              <div className="h-8 w-16 bg-ash-stroke rounded" />
            </div>
            <div className="h-3 w-24 bg-ash-stroke rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function TemplatesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center border-b border-ash-stroke pb-4">
        <div className="h-8 w-44 bg-carbon-lift rounded" />
        <div className="h-10 w-36 bg-carbon-lift rounded" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-ash-stroke bg-carbon-lift p-4 rounded-[10px] space-y-4">
            <div className="space-y-2">
              <div className="h-5 w-40 bg-ash-stroke rounded" />
              <div className="h-3 w-60 bg-ash-stroke rounded" />
            </div>
            <div className="h-12 w-full bg-ash-stroke rounded" />
            <div className="flex gap-2">
              <div className="h-8 w-16 bg-ash-stroke rounded" />
              <div className="h-8 w-20 bg-ash-stroke rounded" />
              <div className="h-8 w-16 bg-ash-stroke rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DocumentsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center border-b border-ash-stroke pb-4">
        <div className="h-8 w-56 bg-carbon-lift rounded" />
        <div className="h-10 w-36 bg-carbon-lift rounded" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="border border-ash-stroke bg-carbon-lift p-4 rounded-[10px] space-y-4">
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 bg-ash-stroke rounded-lg" />
              <div className="flex gap-1">
                <div className="h-8 w-8 bg-ash-stroke rounded" />
                <div className="h-8 w-8 bg-ash-stroke rounded" />
                <div className="h-8 w-8 bg-ash-stroke rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4.5 w-32 bg-ash-stroke rounded" />
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 bg-ash-stroke rounded" />
                <div className="h-3 w-12 bg-ash-stroke rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BatchesSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-between items-center border-b border-ash-stroke pb-4">
        <div className="h-8 w-32 bg-carbon-lift rounded" />
        <div className="h-10 w-32 bg-carbon-lift rounded" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-ash-stroke bg-carbon-lift p-4 rounded-[10px] space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-40 bg-ash-stroke rounded" />
                <div className="h-3 w-56 bg-ash-stroke rounded" />
              </div>
              <div className="h-5 w-16 bg-ash-stroke rounded" />
            </div>
            <div className="h-3 w-48 bg-ash-stroke rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
