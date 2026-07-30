"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

interface NotificationItem {
  id: string
  type: string
  title: string
  body: string | null
  isRead: boolean
  createdAt: string
  refId: string | null
}

const TYPE_ICONS: Record<string, string> = {
  new_reply: "reply",
  batch_completed: "check_circle",
  batch_failed: "error",
  batch_stopped: "stop",
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/notifications?unread=true")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch {
      console.error("Failed to fetch notifications")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const handleMarkRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" })
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { fetchNotifications(); setOpen(!open) }}
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
          open
            ? "border-bone bg-bone text-ink-black"
            : "border-ash-stroke bg-carbon-lift text-bone hover:bg-bone hover:text-ink-black"
        )}
        title="Notifikasi"
      >
        <Icon name="notifications" size="md" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-signal-orange px-1 text-[9px] font-bold text-ink-black">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 rounded-[10px] border border-ash-stroke bg-carbon-lift shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ash-stroke">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-bone uppercase tracking-wider">Notifikasi</p>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-signal-orange/20 px-1.5 py-0.5 text-[9px] font-mono text-signal-orange">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-warm-granite hover:text-bone transition-colors"
                >
                  Tandai semua dibaca
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="space-y-1 p-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3 py-2">
                      <div className="h-5 w-5 rounded-full bg-ash-stroke/50 animate-pulse shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-3/4 rounded bg-ash-stroke/50 animate-pulse" />
                        <div className="h-2 w-1/2 rounded bg-ash-stroke/30 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="h-12 w-12 rounded-full bg-carbon-lift flex items-center justify-center border border-ash-stroke">
                      <Icon name="notifications_off" size="md" className="text-warm-granite" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-bone font-medium">Tidak ada notifikasi</p>
                    <p className="text-[10px] text-warm-granite mt-0.5">
                      Notifikasi baru akan muncul di sini
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-ash-stroke/50">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 transition-colors",
                        !n.isRead ? "bg-obsidian-canvas/40" : "hover:bg-obsidian-canvas/20"
                      )}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="relative shrink-0">
                          <Icon
                            name={TYPE_ICONS[n.type] || "notifications"}
                            size="sm"
                            className={cn(
                              "mt-0.5",
                              !n.isRead ? "text-bone" : "text-warm-granite"
                            )}
                          />
                          {!n.isRead && (
                            <span className="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full bg-signal-orange" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={cn("text-xs truncate", !n.isRead ? "text-bone font-medium" : "text-warm-granite")}>
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="text-[10px] text-warm-granite/70 mt-0.5 line-clamp-1">{n.body}</p>
                          )}
                          <p className="text-[9px] text-warm-granite/50 mt-1">
                            {new Date(n.createdAt).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="h-6 shrink-0 rounded-[3px] border border-ash-stroke px-2 text-[9px] text-warm-granite hover:text-bone hover:border-bone/50 transition-colors"
                        >
                          Baca
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
