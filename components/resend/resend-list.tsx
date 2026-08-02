"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@/components/ui/icon"
import { Card, CardContent } from "@/components/ui/card"

interface ResendScheduleItem {
  id: string
  scheduledSendAt: string
  status: string
  batchRecipient: {
    recipient: { id: string; companyName: string; hrEmail: string; position: string | null }
    batch: { id: string; name: string }
  }
}

export function ResendList() {
  const [schedules, setSchedules] = useState<ResendScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch("/api/resend")
      const json = await res.json()
      setSchedules(Array.isArray(json) ? json : [])
    } catch {
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  async function cancelSingle(id: string) {
    await fetch(`/api/resend?id=${id}`, { method: "DELETE" })
    setSchedules((prev) => prev.filter((s) => s.id !== id))
  }

  async function cancelSelected() {
    for (const id of selected) {
      await fetch(`/api/resend?id=${id}`, { method: "DELETE" })
    }
    setSchedules((prev) => prev.filter((s) => !selected.has(s.id)))
    setSelected(new Set())
  }

  async function cancelAll() {
    const ids = schedules.map((s) => s.id)
    for (const id of ids) {
      await fetch(`/api/resend?id=${id}`, { method: "DELETE" })
    }
    setSchedules([])
    setSelected(new Set())
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="hourglass_empty" size="lg" className="text-warm-granite" />
      </div>
    )
  }

  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-8 text-warm-granite">
            <Icon name="check_circle" size="lg" className="text-metric-green" />
            <p className="text-sm font-mono">No pending resend schedules</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {selected.size > 0 && (
          <Button variant="danger" size="sm" onClick={cancelSelected}>
            Cancel Selected ({selected.size})
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={cancelAll}>
          Cancel All ({schedules.length})
        </Button>
      </div>

      <div className="space-y-2">
        {schedules.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                  className="h-4 w-4 accent-bone"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-bone">
                      {s.batchRecipient.recipient.companyName}
                    </span>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                  <p className="text-xs text-warm-granite mt-0.5">
                    {s.batchRecipient.recipient.hrEmail}
                    {s.batchRecipient.recipient.position && ` — ${s.batchRecipient.recipient.position}`}
                  </p>
                  <p className="text-xs text-warm-granite mt-0.5">
                    Batch: {s.batchRecipient.batch.name} — Resend at{" "}
                    {new Date(s.scheduledSendAt).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-error border-error-container/30 hover:bg-error-container/20"
                onClick={() => cancelSingle(s.id)}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
