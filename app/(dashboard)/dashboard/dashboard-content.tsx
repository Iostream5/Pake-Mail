"use client"

import { useState, useEffect } from "react"
import { Icon } from "@/components/ui/icon"
import { MonoLabel } from "@/components/ui/mono-label"
import { StatusPulse } from "@/components/ui/status-pulse"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { RunningBatch } from "@/components/dashboard/running-batch"
import { UpcomingSchedule } from "@/components/dashboard/upcoming-schedule"
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
    totalReplyThreads: number
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
    receivedAt: string
    snippet: string
    isLikelyAutomated: boolean
    batchRecipient: {
      recipient: { companyName: string; position: string | null; hrEmail: string }
      batch: { name: string }
    }
  }>
  runningBatches: Array<{
    id: string
    name: string
    progress: number
    _count: { batchRecipients: number }
  }>
  upcomingBatches: Array<{
    id: string
    name: string
    scheduledAt: string
    emailAccount: { email: string }
    template: { name: string }
    _count: { batchRecipients: number }
  }>
  recentActivity: Array<{
    id: string
    eventType: string
    message: string
    createdAt: string
    batchId: string | null
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
    totalBatches: 0, activeBatches: 0, totalRecipients: 0,
    totalEmailAccounts: 0, totalSent: 0, totalReplies: 0,
    totalFailed: 0, replyRate: "0.0", totalReplyThreads: 0,
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "RUNNING": return "orange"
      case "COMPLETED": case "ACCEPTED": case "OFFERING": return "green"
      case "INTERVIEW": case "HR_INTERVIEW": case "TECHNICAL_TEST": case "REPLY": return "green"
      case "FAILED": case "STOPPED": return "danger"
      default: return "default"
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-10">
      {/* Header */}
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

      {/* Metrics Grid — clickable numbers */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/batches">
          <Card variant="dark" className="p-5 flex flex-col justify-between hover:border-bone/50 transition-colors">
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
        </Link>

        <Link href="/dashboard/recipients">
          <Card variant="dark" className="p-5 flex flex-col justify-between hover:border-bone/50 transition-colors">
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
        </Link>

        <Link href="/dashboard/replies">
          <Card variant="dark" className="p-5 flex flex-col justify-between hover:border-bone/50 transition-colors">
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
        </Link>

        <Link href="/dashboard/email-accounts">
          <Card variant="dark" className="p-5 flex flex-col justify-between hover:border-bone/50 transition-colors">
            <MonoLabel size="xs" color="warm-granite" className="block mb-2">
              Akun Email Terhubung
            </MonoLabel>
            <div className="flex items-baseline justify-between">
              <span className="font-[family-name:var(--font-geist-sans)] text-3xl text-bone">
                {metrics.totalEmailAccounts}
              </span>
              <span className="text-xs text-warm-granite font-[family-name:var(--font-geist-mono)]">
                Kelola
              </span>
            </div>
          </Card>
        </Link>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-8">
          {/* Recent Batches */}
          <div className="space-y-4">
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
                <>
                  {data.recentBatches.slice(0, 5).map((batch) => (
                    <Card key={batch.id} variant="dark" className="p-5 flex items-center justify-between hover:border-bone/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <Link href={`/dashboard/batches/${batch.id}`} className="font-[family-name:var(--font-geist-sans)] text-base font-medium text-bone hover:underline">
                            {batch.name}
                          </Link>
                          <Badge variant={getStatusBadgeVariant(batch.status)}>{batch.status}</Badge>
                        </div>
                        <p className="text-xs text-warm-granite flex items-center gap-4">
                          <span>Email: {batch.emailAccount.email}</span>
                          <span>·</span>
                          <span>Target: {batch._count.batchRecipients} Perusahaan</span>
                        </p>
                      </div>
                      <Link href={`/dashboard/batches/${batch.id}`}>
                        <Button variant="ghost" size="sm">
                          <Icon name="arrow_forward" size="sm" />
                        </Button>
                      </Link>
                    </Card>
                  ))}
                  {data.recentBatches.length > 5 && (
                    <Link href="/dashboard/batches" className="relative block">
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-carbon-lift to-transparent pointer-events-none" />
                      <div className="relative py-3 text-center bg-carbon-lift rounded-[10px] border border-ash-stroke">
                        <span className="text-xs text-warm-granite hover:text-bone transition-colors">
                          tampilkan lainnya <span className="text-metric-green">→</span>
                        </span>
                      </div>
                    </Link>
                  )}
                </>
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
                    <Button variant="primary" size="sm">Buat Batch Sekarang</Button>
                  </Link>
                </Card>
              )}
            </div>
          </div>

          {/* Running Batch */}
          <div className="space-y-4">
            <div>
              <h3 className="font-[family-name:var(--font-geist-sans)] text-xl text-bone font-medium tracking-tight">
                Batch Berjalan
              </h3>
              <MonoLabel size="xs">Progres pengiriman batch aktif</MonoLabel>
            </div>
            <Card variant="dark" className="p-0 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-warm-granite text-sm">Memuat...</div>
              ) : (
                <RunningBatch batches={data?.runningBatches?.slice(0, 5) || []} hasMore={(data?.runningBatches?.length ?? 0) > 5} />
              )}
            </Card>
          </div>

          {/* Upcoming Schedule */}
          <div className="space-y-4">
            <div>
              <h3 className="font-[family-name:var(--font-geist-sans)] text-xl text-bone font-medium tracking-tight">
                Jadwal Batch Mendatang
              </h3>
              <MonoLabel size="xs">Batch yang dijadwalkan akan berjalan otomatis</MonoLabel>
            </div>
            <Card variant="dark" className="p-0 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-warm-granite text-sm">Memuat...</div>
              ) : (
                <UpcomingSchedule batches={data?.upcomingBatches?.slice(0, 5) || []} hasMore={(data?.upcomingBatches?.length ?? 0) > 5} />
              )}
            </Card>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-8">
          {/* Recent Replies */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-[family-name:var(--font-geist-sans)] text-xl text-bone font-medium tracking-tight">
                  Balasan Terbaru
                </h3>
                <MonoLabel size="xs">Update status & balasan lamaran</MonoLabel>
              </div>
              <Link href="/dashboard/replies">
                <Button variant="ghost" size="sm">
                  Lihat Semua ({metrics.totalReplyThreads})
                </Button>
              </Link>
            </div>

            <Card variant="dark" className="p-0 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-warm-granite text-sm">Memuat data balasan...</div>
              ) : data?.recentReplies && data.recentReplies.length > 0 ? (
                <div className="divide-y divide-ash-stroke">
                  {data.recentReplies.slice(0, 5).map((reply) => (
                    <div key={reply.id} className="p-4 flex items-start justify-between text-xs hover:bg-obsidian-canvas/50 transition-colors gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-bone truncate">
                            {reply.batchRecipient.recipient.companyName}
                          </p>
                          {reply.isLikelyAutomated && (
                            <Badge variant="warning">Auto</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-warm-granite truncate">
                          {reply.batchRecipient.recipient.position || reply.batchRecipient.recipient.hrEmail}
                        </p>
                        <p className="text-[10px] text-warm-granite line-clamp-1">{reply.snippet}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-warm-granite">
                          {new Date(reply.receivedAt).toLocaleDateString("id-ID", {
                            day: "numeric", month: "short",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {data.recentReplies.length > 5 && (
                    <Link href="/dashboard/replies" className="relative block">
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-carbon-lift to-transparent pointer-events-none" />
                      <div className="relative px-4 py-3 text-center">
                        <span className="text-xs text-warm-granite hover:text-bone transition-colors">
                          tampilkan lainnya <span className="text-metric-green">→</span>
                        </span>
                      </div>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="p-10 text-center space-y-3">
                  <Icon name="mark_email_read" size="xl" className="text-warm-granite opacity-60 mx-auto" />
                  <div>
                    <p className="text-sm text-bone font-medium">Belum ada balasan</p>
                    <p className="text-xs text-warm-granite mt-1">
                      Balasan perusahaan akan muncul di sini.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <div>
              <h3 className="font-[family-name:var(--font-geist-sans)] text-xl text-bone font-medium tracking-tight">
                Aktivitas Terbaru
              </h3>
              <MonoLabel size="xs">Log aktivitas sistem</MonoLabel>
            </div>
            <Card variant="dark" className="p-0 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-warm-granite text-sm">Memuat...</div>
              ) : (
                <RecentActivity activities={data?.recentActivity?.slice(0, 5) || []} totalBatches={metrics.totalBatches} hasMore={(data?.recentActivity?.length ?? 0) > 5} />
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
