"use client"

import { Icon } from "@/components/ui/icon"
import Link from "next/link"

const EVENT_ICONS: Record<string, string> = {
  EMAIL_SENT: "send",
  EMAIL_FAILED: "error",
  BATCH_STARTED: "play_arrow",
  BATCH_COMPLETED: "check_circle",
  BATCH_PAUSED: "pause",
  BATCH_RESUMED: "play_circle",
  BATCH_STOPPED: "stop",
  REPLY_DETECTED: "reply",
  AUTO_REPLY_DETECTED: "mail_lock",
  STATUS_UPDATED: "update",
}

interface ActivityItem {
  id: string
  eventType: string
  message: string
  createdAt: string
  batchId: string | null
}

export function RecentActivity({ activities, totalBatches, hasMore = false, viewAllHref = "/dashboard/batches" }: { activities: ActivityItem[]; totalBatches: number; hasMore?: boolean; viewAllHref?: string }) {
  if (activities.length === 0) {
    return (
      <div className="p-8 text-center space-y-3">
        <Icon name="history" size="xl" className="text-warm-granite opacity-60 mx-auto" />
        <p className="text-sm text-bone font-medium">Belum ada aktivitas</p>
        <p className="text-xs text-warm-granite">Aktivitas terbaru akan muncul di sini</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-ash-stroke">
      {activities.map((a) => (
        <div key={a.id} className="p-3 flex items-start gap-3 hover:bg-obsidian-canvas/50 transition-colors">
          <div className="mt-0.5">
            <Icon name={EVENT_ICONS[a.eventType] || "circle"} size="sm" className="text-warm-granite" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-bone truncate">{a.message}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] text-warm-granite">
                {new Date(a.createdAt).toLocaleString("id-ID", {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </span>
              {a.batchId && (
                <>
                  <span className="text-[10px] text-warm-granite">·</span>
                  <Link href={`/dashboard/batches/${a.batchId}`} className="text-[10px] text-metric-green hover:underline">
                    Lihat batch
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
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
