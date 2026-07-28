"use client"

import { useState, useEffect } from "react"
import { Icon } from "@/components/ui/icon"
import { MonoLabel } from "@/components/ui/mono-label"
import { StatusPulse } from "@/components/ui/status-pulse"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import Link from "next/link"

interface DashboardStats {
  metrics: {
    totalBatches: number
    activeBatches: number
    totalRecipients: number
    totalEmailAccounts: number
    totalSent: number
    totalReplies: number
    totalFailed: number
    replyRate: string
  }
  recentBatches: Array<{
    id: string
    name: string
    status: string
    createdAt: string
    emailAccount: { email: string }
    template: { name: string }
    _count: { batchRecipients: number }
  }>
  recentReplies: Array<{
    id: string
    status: string
    updatedAt: string
    recipient: {
      companyName: string
      position: string | null
      hrEmail: string
      location: string | null
    }
    batch: {
      name: string
    }
  }>
}

export function DashboardContent({ userName }: { userName: string }) {
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadStats() {
      try {
        const res = await fetch("/api/dashboard/stats")
        if (res.ok && !cancelled) {
          const json = await res.json()
          setData(json.data || json)
        }
      } catch (err) {
        if (!cancelled) console.error("Failed loading dashboard stats", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadStats()
    const interval = setInterval(loadStats, 15000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const metrics = data?.metrics || {
    totalBatches: 0,
    activeBatches: 0,
    totalRecipients: 0,
    totalEmailAccounts: 0,
    totalSent: 0,
    totalReplies: 0,
    totalFailed: 0,
    replyRate: "0.0",
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "RUNNING":
        return "orange"
      case "COMPLETED":
      case "ACCEPTED":
      case "OFFERING":
        return "green"
      case "INTERVIEW":
      case "HR_INTERVIEW":
      case "TECHNICAL_TEST":
      case "REPLY":
        return "green"
      case "FAILED":
      case "STOPPED":
        return "danger"
      default:
        return "default"
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-10">
      {/* ─── Header & Operations Summary ─── */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-ash-stroke pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <StatusPulse color={metrics.activeBatches > 0 ? "orange" : "green"} />
            <MonoLabel>
              {metrics.activeBatches > 0 ? `${metrics.activeBatches} BATCH ACTIVE` : "SYSTEM OPERATIONAL"}
            </MonoLabel>
          </div>
          <h2 className="font-[family-name:var(--font-geist-sans)] text-3xl md:text-[40px] text-bone leading-tight tracking-tight">
            Selamat datang, {userName}
          </h2>
          <p className="text-sm text-warm-granite max-w-xl mt-1">
            Ringkasan operasi batch pengiriman lamaran kerja dan respon perusahaan real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/batches/new">
            <Button variant="primary" size="md">
              <Icon name="add" size="sm" />
              Buat Batch Baru
            </Button>
          </Link>
          <Link href="/dashboard/recipients">
            <Button variant="ghost" size="md">
              + Perusahaan
            </Button>
          </Link>
        </div>
      </section>

      {/* ─── Operational Metrics Grid ─── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="dark" className="p-5 flex flex-col justify-between">
          <MonoLabel size="xs" color="warm-granite" className="block mb-2">
            Total Campaign (Batch)
          </MonoLabel>
          <div className="flex items-baseline justify-between">
            <span className="font-[family-name:var(--font-geist-sans)] text-3xl text-bone">
              {metrics.totalBatches}
            </span>
            <span className="text-xs text-warm-granite font-[family-name:var(--font-geist-mono)]">
              {metrics.activeBatches} Berjalan
            </span>
          </div>
        </Card>

        <Card variant="dark" className="p-5 flex flex-col justify-between">
          <MonoLabel size="xs" color="warm-granite" className="block mb-2">
            Lamaran Terkirim
          </MonoLabel>
          <div className="flex items-baseline justify-between">
            <span className="font-[family-name:var(--font-geist-sans)] text-3xl text-bone">
              {metrics.totalSent}
            </span>
            <span className="text-xs text-warm-granite font-[family-name:var(--font-geist-mono)]">
              / {metrics.totalRecipients} Perusahaan
            </span>
          </div>
        </Card>

        <Card variant="dark" className="p-5 flex flex-col justify-between">
          <MonoLabel size="xs" color="warm-granite" className="block mb-2">
            Respon & Interview
          </MonoLabel>
          <div className="flex items-baseline justify-between">
            <span className="font-[family-name:var(--font-geist-sans)] text-3xl text-metric-green">
              {metrics.totalReplies}
            </span>
            <span className="text-xs text-metric-green font-[family-name:var(--font-geist-mono)]">
              {metrics.replyRate}% Rate
            </span>
          </div>
        </Card>

        <Card variant="dark" className="p-5 flex flex-col justify-between">
          <MonoLabel size="xs" color="warm-granite" className="block mb-2">
            Akun Email Terhubung
          </MonoLabel>
          <div className="flex items-baseline justify-between">
            <span className="font-[family-name:var(--font-geist-sans)] text-3xl text-bone">
              {metrics.totalEmailAccounts}
            </span>
            <Link href="/dashboard/email-accounts" className="text-xs text-warm-granite hover:text-bone underline">
              Kelola
            </Link>
          </div>
        </Card>
      </section>

      {/* ─── Main Content Grid: Campaign & Replies ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Data Campaign / Batch Terbaru (8 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-[family-name:var(--font-geist-sans)] text-xl text-bone font-medium tracking-tight">
                Data Campaign (Batch Lamaran)
              </h3>
              <MonoLabel size="xs">Aktivitas pengiriman massal terakhir</MonoLabel>
            </div>
            <Link href="/dashboard/batches">
              <Button variant="ghost" size="sm">
                Lihat Semua ({metrics.totalBatches})
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              <Card variant="dark" className="p-8 text-center text-warm-granite text-sm">
                Memuat data campaign...
              </Card>
            ) : data?.recentBatches && data.recentBatches.length > 0 ? (
              data.recentBatches.map((batch) => (
                <Card
                  key={batch.id}
                  variant="dark"
                  className="p-5 flex items-center justify-between hover:border-bone/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/dashboard/batches/${batch.id}`}
                        className="font-[family-name:var(--font-geist-sans)] text-base font-medium text-bone hover:underline"
                      >
                        {batch.name}
                      </Link>
                      <Badge variant={getStatusBadgeVariant(batch.status)}>
                        {batch.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-warm-granite flex items-center gap-4">
                      <span>Email: {batch.emailAccount.email}</span>
                      <span>•</span>
                      <span>Target: {batch._count.batchRecipients} Perusahaan</span>
                    </p>
                  </div>

                  <Link href={`/dashboard/batches/${batch.id}`}>
                    <Button variant="ghost" size="sm">
                      <Icon name="arrow_forward" size="sm" />
                    </Button>
                  </Link>
                </Card>
              ))
            ) : (
              <Card variant="dark" className="p-10 text-center space-y-4">
                <Icon name="layers" size="xl" className="text-warm-granite opacity-60 mx-auto" />
                <div>
                  <p className="text-sm text-bone font-medium">Belum ada campaign / batch lamaran</p>
                  <p className="text-xs text-warm-granite mt-1">
                    Buat batch baru untuk mengirim lamaran terstruktur ke banyak perusahaan secara otomatis.
                  </p>
                </div>
                <Link href="/dashboard/batches/new">
                  <Button variant="primary" size="sm">
                    Buat Batch Sekarang
                  </Button>
                </Link>
              </Card>
            )}
          </div>
        </div>

        {/* Right Column: Tabel Respon & Status Perusahaan (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-[family-name:var(--font-geist-sans)] text-xl text-bone font-medium tracking-tight">
                Respon Perusahaan (Replies)
              </h3>
              <MonoLabel size="xs">Update status & balasan lamaran</MonoLabel>
            </div>
            <Link href="/dashboard/recipients">
              <Button variant="ghost" size="sm">
                Lihat Semua
              </Button>
            </Link>
          </div>

          <Card variant="dark" className="p-0 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-warm-granite text-sm">
                Memuat data balasan...
              </div>
            ) : data?.recentReplies && data.recentReplies.length > 0 ? (
              <div className="divide-y divide-ash-stroke">
                {data.recentReplies.map((reply) => (
                  <div key={reply.id} className="p-4 flex items-center justify-between text-xs hover:bg-obsidian-canvas/50 transition-colors">
                    <div className="space-y-1 max-w-[220px]">
                      <p className="font-medium text-bone truncate">
                        {reply.recipient.companyName}
                      </p>
                      <p className="text-[11px] text-warm-granite truncate">
                        {reply.recipient.position || reply.recipient.hrEmail}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant={getStatusBadgeVariant(reply.status)}>
                        {reply.status}
                      </Badge>
                      <p className="text-[10px] text-warm-granite">
                        {new Date(reply.updatedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center space-y-3">
                <Icon name="mark_email_read" size="xl" className="text-warm-granite opacity-60 mx-auto" />
                <div>
                  <p className="text-sm text-bone font-medium">Belum ada catatan respon</p>
                  <p className="text-xs text-warm-granite mt-1">
                    Status respon perusahaan (Reply, Interview, Offering) akan otomatis ditampilkan di sini.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
