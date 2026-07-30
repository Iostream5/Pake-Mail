import { prisma } from "@/lib/prisma"
import { Queue, Worker } from "bullmq"
import { redis } from "@/lib/redis"

const NOTIF_BATCH_QUEUE = "notification-batch-queue"
const BATCH_INTERVAL_MS = 60 * 60 * 1000

export const notifBatchQueue = new Queue(NOTIF_BATCH_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 5 },
  },
})

export async function processNotificationBatch() {
  const oneHourAgo = new Date(Date.now() - BATCH_INTERVAL_MS)

  const recentNotifications = await prisma.notification.findMany({
    where: { createdAt: { gte: oneHourAgo } },
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
  })

  const byUser = new Map<string, typeof recentNotifications>()
  for (const n of recentNotifications) {
    const list = byUser.get(n.userId) ?? []
    list.push(n)
    byUser.set(n.userId, list)
  }

  for (const [userId, notifs] of byUser) {
    const user = notifs[0]!.user
    if (!user.email) continue

    const replyNotifs = notifs.filter((n) => n.type === "new_reply")
    const batchNotifs = notifs.filter((n) => n.type.startsWith("batch_"))

    const lines: string[] = ["Ringkasan notifikasi 1 jam terakhir:", ""]

    if (replyNotifs.length > 0) {
      lines.push(`Balasan baru: ${replyNotifs.length}`)
      for (const n of replyNotifs.slice(0, 5)) {
        lines.push(`  • ${n.title}`)
      }
      if (replyNotifs.length > 5) {
        lines.push(`  ... dan ${replyNotifs.length - 5} lainnya`)
      }
      lines.push("")
    }

    if (batchNotifs.length > 0) {
      lines.push(`Update batch: ${batchNotifs.length}`)
      for (const n of batchNotifs) {
        lines.push(`  • ${n.title}`)
      }
      lines.push("")
    }

    if (lines.length <= 1) continue

    console.log(`[NotifBatcher] Would send email to ${user.email}:\n${lines.join("\n")}`)
  }

  await scheduleNextBatch()
}

export async function scheduleNextBatch() {
  const jobs = await notifBatchQueue.getRepeatableJobs()
  const existing = jobs.find((j) => j.name === "notification-batch")

  if (!existing) {
    await notifBatchQueue.upsertJobScheduler(
      "notification-batch",
      { every: BATCH_INTERVAL_MS },
      { name: "notification-batch", data: {} }
    )
    console.log(`[NotifBatcher] Scheduled hourly batch`)
  }
}
