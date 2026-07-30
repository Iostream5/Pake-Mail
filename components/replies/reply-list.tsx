"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"

interface ReplyRecipient {
  companyName: string
  hrEmail: string
  position: string | null
}

interface ReplyBatch {
  name: string
}

interface BatchRecipient {
  recipient: ReplyRecipient
  batch: ReplyBatch
}

interface Reply {
  id: string
  gmailThreadId: string
  snippet: string
  receivedAt: string
  isLikelyAutomated: boolean
  userLabel: string | null
  batchRecipient: BatchRecipient
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface Counts {
  auto: number
  manual: number
}

const LABEL_OPTIONS = [
  { value: "perlu_jadwal_ulang", label: "Perlu jadwal ulang" },
  { value: "auto_reply", label: "Auto-reply" },
  { value: "bukan_relevan", label: "Bukan relevan" },
  { value: "tindak_lanjut", label: "Perlu ditindaklanjuti" },
]

const AVATAR_COLORS = [
  "bg-blue-600", "bg-emerald-600", "bg-amber-600", "bg-rose-600",
  "bg-violet-600", "bg-cyan-600", "bg-pink-600", "bg-lime-600",
]

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).filter(Boolean).join("").toUpperCase() || "?"
}

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function ReplyList() {
  const [replies, setReplies] = useState<Reply[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [counts, setCounts] = useState<Counts>({ auto: 0, manual: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<string>("")
  const [sort, setSort] = useState<string>("newest")
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const fetchReplies = useCallback(async (page: number, type: string, q: string, sortBy: string) => {
    try {
      setLoading(true)
      setError("")
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (type) params.set("type", type)
      if (q) params.set("q", q)
      if (sortBy) params.set("sort", sortBy)
      const res = await fetch(`/api/replies?${params}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setReplies(data.replies)
      setPagination(data.pagination)
      setCounts(data.counts)
    } catch {
      setError("Gagal memuat balasan")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReplies(1, filter, debouncedSearch, sort)
  }, [fetchReplies, filter, debouncedSearch, sort])

  const handleLabel = async (replyId: string, label: string) => {
    try {
      setError("")
      const res = await fetch(`/api/replies/${replyId}/label`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userLabel: label }),
      })
      if (!res.ok) throw new Error("Failed to label")
      await fetchReplies(pagination.page, filter, debouncedSearch, sort)
    } catch {
      setError("Gagal memberi label")
    }
  }

  const handleRemoveLabel = async (replyId: string) => {
    try {
      setError("")
      const res = await fetch(`/api/replies/${replyId}/label`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userLabel: null }),
      })
      if (!res.ok) throw new Error("Failed to remove label")
      await fetchReplies(pagination.page, filter, debouncedSearch, sort)
    } catch {
      setError("Gagal menghapus label")
    }
  }

  const openGmail = (threadId: string) => {
    window.open(`https://mail.google.com/mail/u/0/#inbox/${threadId}`, "_blank")
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    if (diffDays === 1) return "Kemarin"
    if (diffDays < 7) return `${diffDays} hari lalu`
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
  }

  const getLabelName = (value: string) => {
    return LABEL_OPTIONS.find((o) => o.value === value)?.label ?? value
  }

  return (
    <div className="space-y-5">
      {/* Title + Stats */}
      <div>
        <h1 className="font-[family-name:var(--font-geist-sans)] text-2xl text-bone font-medium tracking-tight">
          Balasan (Replies)
        </h1>
        <p className="text-sm text-warm-granite mt-0.5">
          {pagination.total > 0
            ? `${pagination.total} balasan dari perusahaan`
            : "Pantau respon perusahaan terhadap lamaran"}
        </p>
      </div>

      {/* Stats Summary */}
      {pagination.total > 0 && (
        <div className="flex items-center gap-4 text-xs font-[family-name:var(--font-geist-mono)]">
          <span className="text-bone">{pagination.total} Total</span>
          <span className="text-warm-granite">/</span>
          <span className="text-metric-green">{counts.manual} Manual</span>
          <span className="text-warm-granite">/</span>
          <span className="text-signal-orange">{counts.auto} Auto-reply</span>
        </div>
      )}

      {error && (
        <div className="rounded-[3px] border border-signal-orange/30 bg-signal-orange/10 p-3 text-xs text-signal-orange">
          {error}
        </div>
      )}

      {/* Toolbar: Search + Filters + Sort */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Icon
            name="search"
            size="sm"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-granite pointer-events-none"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, page: 1 })) }}
            placeholder="Cari perusahaan atau isi balasan..."
            className="flex h-9 w-full rounded-[3px] border border-ash-stroke bg-carbon-lift pl-9 pr-3 py-2 text-xs text-bone placeholder:text-warm-granite/50 transition-colors focus-visible:outline-none focus-visible:border-bone"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-warm-granite hover:text-bone transition-colors"
            >
              <Icon name="close" size="sm" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex gap-1.5 shrink-0">
          {[
            { value: "", label: "Semua" },
            { value: "manual", label: "Manual" },
            { value: "auto", label: "Auto-reply" },
          ].map((item) => (
            <Button
              key={item.value}
              variant={filter === item.value ? "default" : "ghost"}
              size="sm"
              onClick={() => { setFilter(item.value); setPagination((p) => ({ ...p, page: 1 })) }}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {/* Sort */}
        <div className="relative shrink-0">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-9 rounded-[3px] border border-ash-stroke bg-carbon-lift px-3 pr-8 text-xs text-bone appearance-none cursor-pointer focus-visible:outline-none focus-visible:border-bone"
          >
            <option value="newest" className="bg-carbon-lift text-bone">Terbaru</option>
            <option value="oldest" className="bg-carbon-lift text-bone">Terlama</option>
          </select>
          <Icon name="unfold_more" size="sm" className="absolute right-1.5 top-1/2 -translate-y-1/2 text-warm-granite pointer-events-none" />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} variant="dark">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16 rounded-[3px]" />
                    </div>
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-full" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Skeleton className="h-7 w-7 rounded-[3px]" />
                    <Skeleton className="h-7 w-20 rounded-[3px]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && replies.length === 0 && (
        <Card variant="dark">
          <CardContent className="py-12 text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-full bg-carbon-lift flex items-center justify-center border border-ash-stroke">
                <Icon name="forward_to_inbox" size="lg" className="text-warm-granite" />
              </div>
            </div>
            <div>
              <p className="text-sm text-bone font-medium">
                {search || filter ? "Tidak ada balasan yang cocok" : "Belum ada balasan"}
              </p>
              <p className="text-xs text-warm-granite mt-1 max-w-xs mx-auto">
                {search || filter
                  ? "Coba ubah kata kunci atau filter yang digunakan"
                  : "Balasan dari perusahaan akan muncul di sini setelah terdeteksi oleh sistem"}
              </p>
            </div>
            {(search || filter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(""); setFilter("") }}
              >
                Reset filter
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reply Cards */}
      {!loading && replies.length > 0 && (
        <div className="space-y-2.5">
          {replies.map((reply) => (
            <Card key={reply.id} variant="dark" className="hover:border-bone/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className={`h-9 w-9 rounded-full ${getAvatarColor(reply.batchRecipient.recipient.companyName)} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    <span className="text-xs font-bold text-white leading-none">
                      {getInitials(reply.batchRecipient.recipient.companyName)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-bone truncate">
                        {reply.batchRecipient.recipient.companyName}
                      </p>
                      {reply.isLikelyAutomated ? (
                        <Badge variant="warning">Auto-reply</Badge>
                      ) : (
                        <Badge variant="success">Balasan</Badge>
                      )}
                      {reply.userLabel && (
                        <Badge variant="info">{getLabelName(reply.userLabel)}</Badge>
                      )}
                    </div>
                    {reply.batchRecipient.recipient.position && (
                      <p className="text-xs text-warm-granite mt-0.5">
                        {reply.batchRecipient.recipient.position}
                      </p>
                    )}
                    <p className="mt-1.5 text-xs text-warm-granite/80 line-clamp-2 leading-relaxed">
                      {reply.snippet}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-warm-granite">
                      <span className="truncate max-w-[140px]">{reply.batchRecipient.batch.name}</span>
                      <span>•</span>
                      <span className="shrink-0">{formatDate(reply.receivedAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openGmail(reply.gmailThreadId)}
                      title="Buka di Gmail"
                    >
                      <Icon name="open_in_new" size="sm" />
                    </Button>
                    <select
                      className="h-7 rounded-[3px] border border-ash-stroke bg-carbon-lift px-2 text-[10px] text-bone appearance-none cursor-pointer hover:border-bone/50 transition-colors focus-visible:outline-none focus-visible:border-bone"
                      value={reply.userLabel ?? ""}
                      onChange={(e) => {
                        if (e.target.value) handleLabel(reply.id, e.target.value)
                        else handleRemoveLabel(reply.id)
                      }}
                    >
                      <option value="" className="bg-carbon-lift text-warm-granite">Label</option>
                      {LABEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-carbon-lift text-bone">
                          {opt.label}
                        </option>
                      ))}
                      {reply.userLabel && (
                        <option value="" className="bg-carbon-lift text-signal-orange">
                          Hapus label
                        </option>
                      )}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => fetchReplies(pagination.page - 1, filter, debouncedSearch, sort)}
          >
            <Icon name="arrow_back" size="sm" />
            Sebelumnya
          </Button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
              const start = Math.max(1, pagination.page - 2)
              const end = Math.min(pagination.totalPages, start + 4)
              const adjustedStart = Math.max(1, end - 4)
              const pageNum = adjustedStart + i
              if (pageNum > pagination.totalPages) return null
              return (
                <button
                  key={pageNum}
                  onClick={() => fetchReplies(pageNum, filter, debouncedSearch, sort)}
                  className={`h-8 w-8 rounded-[3px] text-xs font-[family-name:var(--font-geist-mono)] transition-colors ${
                    pageNum === pagination.page
                      ? "bg-chalk text-ink-black"
                      : "text-warm-granite hover:text-bone hover:bg-carbon-lift"
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchReplies(pagination.page + 1, filter, debouncedSearch, sort)}
          >
            Berikutnya
            <Icon name="arrow_forward" size="sm" />
          </Button>
        </div>
      )}
    </div>
  )
}
