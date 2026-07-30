"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Dialog } from "@/components/ui/dialog"

interface BatchListItem {
  id: string
  name: string
  description: string | null
  status: string
  scheduledAt: string | null
  emailAccountId: string
  templateId: string
  createdAt: string
  emailAccount: { email: string; provider: string }
  template: { name: string }
  _count: { batchRecipients: number }
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

export function BatchList() {
  const [batches, setBatches] = useState<BatchListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const fetchBatches = useCallback(async (isBackground = false) => {
    try {
      if (isBackground) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError("")
      const res = await fetch("/api/batches")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setBatches(data)
    } catch {
      setError("Failed to load batches")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchBatches()
    const interval = setInterval(() => fetchBatches(true), 15000)
    return () => clearInterval(interval)
  }, [fetchBatches])

  const handleDelete = async (id: string) => {
    setActionLoading(id)
    setError("")
    try {
      const res = await fetch(`/api/batches?id=${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to delete" }))
        throw new Error(err.error || "Failed to delete")
      }
      setDeleteConfirmId(null)
      await fetchBatches(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete batch")
    } finally {
      setActionLoading(null)
    }
  }

  const handleStart = async (id: string) => {
    setActionLoading(id)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const res = await fetch("/api/batches/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        signal: controller.signal,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to start" }))
        throw new Error(err.error || "Failed to start")
      }
      await fetchBatches(false)
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("Request timed out. Redis may be unavailable.")
      } else {
        setError(e instanceof Error ? e.message : "Failed to start batch")
      }
    } finally {
      clearTimeout(timeout)
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Batches</h2>
          <div className="h-9 w-28 animate-pulse rounded-lg bg-zinc-200" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-zinc-200 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100" />
                </div>
                <div className="h-5 w-14 animate-pulse rounded bg-zinc-200" />
              </div>
              <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Batches</h2>
        <div className="flex items-center gap-3">
          {refreshing && (
            <span className="text-xs text-zinc-400 animate-pulse">Sedang Mengupdate data...</span>
          )}
          <Link
            href="/dashboard/batches/new"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Create Batch
          </Link>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {batches.length === 0 && (
        <div className="rounded-lg border border-zinc-200 p-8 text-center text-sm text-zinc-500">
          No batches yet. Click "Create Batch" to get started.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {batches.map((batch) => (
          <Link
            key={batch.id}
            href={`/dashboard/batches/${batch.id}`}
            className="block rounded-lg border border-zinc-200 p-4 space-y-3 hover:border-zinc-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{batch.name}</p>
                {batch.description && (
                  <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{batch.description}</p>
                )}
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[batch.status] || "bg-zinc-100 text-zinc-700"}`}>
                {batch.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
              <span>{batch.emailAccount.email}</span>
              <span className="text-zinc-300">·</span>
              <span>{batch.template.name}</span>
              <span className="text-zinc-300">·</span>
              <span>{batch._count.batchRecipients} recipients</span>
            </div>

            {["DRAFT", "STOPPED", "FAILED", "COMPLETED"].includes(batch.status) && (
              <div className="flex items-center gap-2 pt-1" onClick={(e) => e.preventDefault()}>
                {batch.status === "DRAFT" && (
                  <button
                    onClick={(e) => { e.preventDefault(); handleStart(batch.id) }}
                    disabled={actionLoading === batch.id}
                    className="inline-flex h-8 items-center justify-center rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {actionLoading === batch.id ? "Starting..." : "Start"}
                  </button>
                )}
                <button
                  onClick={(e) => { e.preventDefault(); setDeleteConfirmId(batch.id) }}
                  disabled={actionLoading === batch.id}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-red-300 px-3 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {actionLoading === batch.id ? "..." : "Delete"}
                </button>
              </div>
            )}
          </Link>
        ))}
      </div>

      <Dialog
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Batch"
        description="Are you sure you want to delete this batch? This action cannot be undone."
      >
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => setDeleteConfirmId(null)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            disabled={deleteConfirmId !== null && actionLoading === deleteConfirmId}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleteConfirmId !== null && actionLoading === deleteConfirmId ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Dialog>
    </div>
  )
}
