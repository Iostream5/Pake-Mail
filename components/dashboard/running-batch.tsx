"use client"

import { Icon } from "@/components/ui/icon"
import { ProgressBar } from "@/components/ui/progress-bar"
import Link from "next/link"

interface RunningBatchItem {
  id: string
  name: string
  progress: number
  _count: { batchRecipients: number }
}

export function RunningBatch({ batches, hasMore = false, viewAllHref = "/dashboard/batches" }: { batches: RunningBatchItem[]; hasMore?: boolean; viewAllHref?: string }) {
  if (batches.length === 0) {
    return (
      <div className="p-8 text-center space-y-3">
        <Icon name="play_circle" size="xl" className="text-warm-granite opacity-60 mx-auto" />
        <p className="text-sm text-bone font-medium">Tidak ada batch berjalan</p>
        <p className="text-xs text-warm-granite">Batch yang sedang berjalan akan muncul di sini</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-ash-stroke">
      {batches.map((b) => (
        <Link key={b.id} href={`/dashboard/batches/${b.id}`} className="block p-4 hover:bg-obsidian-canvas/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-bone truncate">{b.name}</p>
            <span className="text-xs text-metric-green font-[family-name:var(--font-geist-mono)]">{b.progress}%</span>
          </div>
          <ProgressBar value={b.progress} className="mb-1" />
          <p className="text-[10px] text-warm-granite">{b._count.batchRecipients} penerima</p>
        </Link>
      ))}
      {hasMore && (
        <Link href={viewAllHref} className="relative block">
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-carbon-lift to-transparent pointer-events-none" />
          <div className="relative px-4 py-3 text-center bg-carbon-lift">
            <span className="text-xs text-warm-granite hover:text-bone transition-colors">
              tampilkan lainnya <span className="text-metric-green">→</span>
            </span>
          </div>
        </Link>
      )}
    </div>
  )
}
