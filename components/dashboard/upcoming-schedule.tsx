"use client"

import { Icon } from "@/components/ui/icon"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface UpcomingBatchItem {
  id: string
  name: string
  scheduledAt: string
  emailAccount: { email: string }
  template: { name: string }
  _count: { batchRecipients: number }
}

export function UpcomingSchedule({ batches, hasMore = false, viewAllHref = "/dashboard/batches" }: { batches: UpcomingBatchItem[]; hasMore?: boolean; viewAllHref?: string }) {
  if (batches.length === 0) {
    return (
      <div className="p-8 text-center space-y-3">
        <Icon name="calendar_month" size="xl" className="text-warm-granite opacity-60 mx-auto" />
        <p className="text-sm text-bone font-medium">Tidak ada jadwal</p>
        <p className="text-xs text-warm-granite">Batch yang dijadwalkan akan muncul di sini</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-ash-stroke">
      {batches.map((b) => (
        <Link key={b.id} href={`/dashboard/batches/${b.id}`} className="block p-4 hover:bg-obsidian-canvas/50 transition-colors">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-bone truncate">{b.name}</p>
              <p className="text-xs text-warm-granite mt-0.5">{b.template.name} · {b._count.batchRecipients} penerima</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-bone font-[family-name:var(--font-geist-mono)]">
                {new Date(b.scheduledAt).toLocaleDateString("id-ID", {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </p>
              <Badge variant="orange" className="mt-1">Terjadwal</Badge>
            </div>
          </div>
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
