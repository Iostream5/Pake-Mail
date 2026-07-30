"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Dialog } from "@/components/ui/dialog"

interface BatchDetailData {
  id: string
  name: string
  description: string | null
  status: string
  scheduledAt: string | null
  delaySeconds: number
  activeHoursStart: string | null
  activeHoursEnd: string | null
  activeDays: string | null
  retryMax: number
  autoStopThreshold: number
  createdAt: string
  emailAccount: { email: string; provider: string }
  template: { name: string; subject: string }
  batchDocuments: Array<{ id: string; document: { id: string; name: string; category: string } }>
  batchRecipients: Array<{
    id: string
    status: string
    sentAt: string | null
    errorLog: string | null
    retryCount: number
    updatedAt: string
    recipient: { id: string; companyName: string; hrEmail: string; position: string }
  }>
  activityLogs: Array<{ id: string; eventType: string; message: string; createdAt: string }>
  _count: { batchRecipients: number }
  stats: {
    total: number
    pending: number
    sent: number
    failed: number
    skipped: number
    retry: number
  }
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  RUNNING: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  STOPPED: "bg-red-100 text-red-700",
  FAILED: "bg-red-100 text-red-700",
}

const RECIPIENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "text-zinc-500",
  SENT: "text-green-600",
  FAILED: "text-red-600",
  SKIPPED: "text-zinc-400",
  RETRY: "text-yellow-600",
  APPLIED: "text-blue-600",
  REPLY: "text-indigo-600",
  INTERVIEW: "text-purple-600",
  TECHNICAL_TEST: "text-orange-600",
  HR_INTERVIEW: "text-pink-600",
  OFFERING: "text-emerald-600",
  ACCEPTED: "text-emerald-700",
}

const MANUAL_STATUSES = ["APPLIED", "REPLY", "INTERVIEW", "TECHNICAL_TEST", "HR_INTERVIEW", "OFFERING", "ACCEPTED", "REJECTED"]

function parseErrorLog(raw: string): { friendly: string; raw: string } {
  try {
    const parsed = JSON.parse(raw)
    return { friendly: parsed.friendly || parsed.message || raw, raw: parsed.raw || raw }
  } catch {
    return { friendly: raw, raw }
  }
}

export function BatchDetail({ batchId }: { batchId: string }) {
  const router = useRouter()
  const [batch, setBatch] = useState<BatchDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const isActiveRef = useRef(false)

  const fetchBatch = useCallback(async (isBackground = false) => {
    try {
      if (isBackground) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError("")
      const res = await fetch(`/api/batches/${batchId}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setBatch(data)
    } catch {
      setError("Failed to load batch details")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [batchId])

  useEffect(() => {
    fetchBatch()
  }, [fetchBatch])

  useEffect(() => {
    if (batch && !["DRAFT", "SCHEDULED", "RUNNING", "PAUSED"].includes(batch.status)) {
      isActiveRef.current = false
      return
    }
    isActiveRef.current = true
    const interval = setInterval(() => {
      if (isActiveRef.current) fetchBatch(true)
    }, 15000)
    return () => clearInterval(interval)
  }, [batch, fetchBatch])

  const handleAction = async (action: string) => {
    setActionLoading(action)
    setError("")
    try {
      const res = await fetch(`/api/batches/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: batchId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `Failed to ${action}`)
      }
      await fetchBatch(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${action}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRecipientStatus = async (batchRecipientId: string, status: string) => {
    setError("")
    try {
      const res = await fetch("/api/batches/status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchRecipientId, status }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      await fetchBatch()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status")
    }
  }

  const handleDelete = async () => {
    setActionLoading("delete")
    setError("")
    try {
      const res = await fetch(`/api/batches?id=${batchId}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to delete")
      }
      router.push("/dashboard/batches")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete batch")
    } finally {
      setActionLoading(null)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <div className="h-7 w-48 animate-pulse rounded bg-zinc-200" />
              <div className="h-5 w-20 animate-pulse rounded bg-zinc-200" />
            </div>
            <div className="h-4 w-64 animate-pulse rounded bg-zinc-100" />
            <div className="h-3 w-96 animate-pulse rounded bg-zinc-100" />
          </div>
          <div className="h-8 w-16 animate-pulse rounded-lg bg-zinc-200" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-lg border border-zinc-200 p-4">
              <div className="mx-auto h-7 w-12 animate-pulse rounded-full bg-zinc-200" />
              <div className="mx-auto mt-2 h-3 w-10 animate-pulse rounded bg-zinc-100" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <div className="mb-3 h-4 w-24 animate-pulse rounded bg-zinc-200" />
          <div className="space-y-2">
            <div className="h-8 animate-pulse rounded bg-zinc-100" />
            <div className="h-8 animate-pulse rounded bg-zinc-100" />
            <div className="h-8 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
      </div>
    )
  }
  if (!batch) return <div className="text-sm text-red-600">{error || "Batch not found"}</div>

  const isActive = ["RUNNING", "PAUSED", "SCHEDULED"].includes(batch.status)
  const isDraft = batch.status === "DRAFT"

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{batch.name}</h2>
            {refreshing && <span className="text-xs text-zinc-400 animate-pulse">Sedang Mengupdate data...</span>}
            <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", STATUS_COLORS[batch.status] || "bg-zinc-100 text-zinc-700")}>
              {batch.status}
            </span>
          </div>
          {batch.description && <p className="text-sm text-zinc-500 mt-1">{batch.description}</p>}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-500">
            <span>{batch.emailAccount.email}</span>
            <span className="text-zinc-300">·</span>
            <span>{batch.template.name}</span>
            <span className="text-zinc-300">·</span>
            <span>{batch._count.batchRecipients} recipients</span>
            {batch.scheduledAt && (
              <>
                <span className="text-zinc-300">·</span>
                <span>Scheduled: {new Date(batch.scheduledAt).toLocaleString()}</span>
              </>
            )}
          </div>
        </div>

        {(isDraft || isActive || ["DRAFT", "STOPPED", "FAILED", "COMPLETED"].includes(batch.status)) && (
          <div className="flex flex-wrap items-center gap-2">
            {isDraft && (
              <button
                onClick={() => handleAction("start")}
                disabled={actionLoading === "start"}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {actionLoading === "start" ? "Starting..." : "Start"}
              </button>
            )}
            {batch.status === "RUNNING" && (
              <button
                onClick={() => handleAction("pause")}
                disabled={actionLoading === "pause"}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-yellow-300 px-3 text-xs font-medium text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
              >
                {actionLoading === "pause" ? "..." : "Pause"}
              </button>
            )}
            {batch.status === "PAUSED" && (
              <button
                onClick={() => handleAction("resume")}
                disabled={actionLoading === "resume"}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-green-300 px-3 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
              >
                {actionLoading === "resume" ? "..." : "Resume"}
              </button>
            )}
            {["RUNNING", "PAUSED", "SCHEDULED"].includes(batch.status) && (
              <button
                onClick={() => handleAction("stop")}
                disabled={actionLoading === "stop"}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-red-300 px-3 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {actionLoading === "stop" ? "..." : "Stop"}
              </button>
            )}
            {["DRAFT", "STOPPED", "FAILED", "COMPLETED"].includes(batch.status) && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={actionLoading === "delete"}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-red-300 px-3 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {actionLoading === "delete" ? "..." : "Delete"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: "Total", value: batch.stats.total, color: "bg-zinc-100 text-zinc-700" },
          { label: "Pending", value: batch.stats.pending, color: "bg-blue-100 text-blue-700" },
          { label: "Sent", value: batch.stats.sent, color: "bg-green-100 text-green-700" },
          { label: "Failed", value: batch.stats.failed, color: "bg-red-100 text-red-700" },
          { label: "Skipped", value: batch.stats.skipped, color: "bg-zinc-100 text-zinc-500" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-zinc-200 p-4 text-center">
            <p className={cn("inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold", stat.color)}>
              {stat.value}
            </p>
            <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {batch.batchDocuments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Attached Documents</h3>
          <div className="flex flex-wrap gap-2">
            {batch.batchDocuments.map((bd) => (
              <span key={bd.id} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600">
                {bd.document.name}
                <span className="ml-1.5 text-zinc-400">({bd.document.category})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Recipients</h3>

        {/* Table - Desktop */}
        <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Position</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Sent At</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Update Status</th>
              </tr>
            </thead>
            <tbody>
              {batch.batchRecipients.map((br) => (
                <tr key={br.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3 text-sm font-medium">{br.recipient.companyName}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{br.recipient.hrEmail}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{br.recipient.position || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-medium", RECIPIENT_STATUS_COLORS[br.status] || "text-zinc-500")}>
                        {br.status}
                      </span>
                      {br.errorLog && (() => {
                        const { friendly, raw } = parseErrorLog(br.errorLog!)
                        const isExpanded = expandedErrors.has(br.id)
                        return (
                          <div className="text-[10px]">
                            <div className="flex items-center gap-1">
                              <span className="text-red-500 truncate max-w-32">{friendly}</span>
                              {raw !== friendly && (
                                <button
                                  onClick={() => {
                                    setExpandedErrors((prev) => {
                                      const next = new Set(prev)
                                      if (isExpanded) next.delete(br.id)
                                      else next.add(br.id)
                                      return next
                                    })
                                  }}
                                  className="text-zinc-400 hover:text-zinc-600 underline shrink-0"
                                >
                                  {isExpanded ? "Sembunyikan" : "Detail teknis"}
                                </button>
                              )}
                            </div>
                            {isExpanded && (
                              <pre className="mt-1 whitespace-pre-wrap text-zinc-400 bg-zinc-50 p-1 rounded max-w-64 overflow-x-auto">{raw}</pre>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {br.sentAt ? new Date(br.sentAt).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) handleRecipientStatus(br.id, e.target.value)
                      }}
                      className="rounded border border-zinc-300 px-2 py-1 text-xs outline-none focus:border-zinc-500"
                    >
                      <option value="" disabled>Change...</option>
                      {MANUAL_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards - Mobile */}
        <div className="space-y-3 sm:hidden">
          {batch.batchRecipients.map((br) => (
            <div key={br.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{br.recipient.companyName}</p>
                  <p className="text-xs text-zinc-600">{br.recipient.hrEmail}</p>
                </div>
                <span className={cn("shrink-0 text-xs font-medium", RECIPIENT_STATUS_COLORS[br.status] || "text-zinc-500")}>
                  {br.status}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                {br.recipient.position && <span>Posisi: {br.recipient.position}</span>}
                <span>Sent: {br.sentAt ? new Date(br.sentAt).toLocaleString() : "-"}</span>
              </div>
              {br.errorLog && (() => {
                const { friendly, raw } = parseErrorLog(br.errorLog!)
                const isExpanded = expandedErrors.has(br.id)
                return (
                  <div className="mt-1 text-[10px]">
                    <span className="text-red-500">{friendly}</span>
                    {raw !== friendly && (
                      <button
                        onClick={() => {
                          setExpandedErrors((prev) => {
                            const next = new Set(prev)
                            if (isExpanded) next.delete(br.id)
                            else next.add(br.id)
                            return next
                          })
                        }}
                        className="ml-1 text-zinc-400 hover:text-zinc-600 underline"
                      >
                        {isExpanded ? "Sembunyikan" : "Detail teknis"}
                      </button>
                    )}
                    {isExpanded && (
                      <pre className="mt-1 whitespace-pre-wrap text-zinc-400 bg-zinc-50 p-1 rounded">{raw}</pre>
                    )}
                  </div>
                )
              })()}
              {["SENT", "FAILED", "SKIPPED", "RETRY"].includes(br.status) && (
                <div className="mt-2">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) handleRecipientStatus(br.id, e.target.value)
                    }}
                    className="w-full rounded border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-zinc-500"
                  >
                    <option value="" disabled>Update Status...</option>
                    {MANUAL_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {batch.activityLogs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Activity Log</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 p-3">
            {batch.activityLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-xs">
                <span className="text-zinc-400 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
                <span className="text-zinc-600">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-zinc-500">Delay Between Emails</p>
          <p className="text-sm font-medium">{batch.delaySeconds}s</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Active Hours</p>
          <p className="text-sm font-medium">{batch.activeHoursStart || "N/A"} - {batch.activeHoursEnd || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Active Days</p>
          <p className="text-sm font-medium">{batch.activeDays || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Retry Max</p>
          <p className="text-sm font-medium">{batch.retryMax}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Auto-Stop Threshold</p>
          <p className="text-sm font-medium">{(batch.autoStopThreshold * 100).toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Created</p>
          <p className="text-sm font-medium">{new Date(batch.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Batch"
        description="Are you sure you want to delete this batch? This action cannot be undone."
      >
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={actionLoading === "delete"}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {actionLoading === "delete" ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Dialog>
    </div>
  )
}
