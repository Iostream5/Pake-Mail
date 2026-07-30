import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess } from "@/lib/api-helpers"

export async function GET() {
  return handleApi(async () => {
    const userId = await requireUserId()

    const [
      totalBatches,
      activeBatches,
      totalRecipients,
      totalEmailAccounts,
      batchRecipientsStats,
      recentBatches,
      recentReplies,
      runningBatches,
      upcomingBatches,
      recentActivity,
      replyThreads,
    ] = await Promise.all([
      prisma.batch.count({ where: { userId } }),

      prisma.batch.count({
        where: { userId, status: { in: ["RUNNING", "SCHEDULED"] } },
      }),

      prisma.recipient.count({ where: { userId } }),

      prisma.emailAccount.count({ where: { userId } }),

      prisma.batch.findMany({
        where: { userId },
        select: { id: true },
      }).then((batches) => {
        const ids = batches.map((b) => b.id)
        if (ids.length === 0) return []
        return prisma.batchRecipient.groupBy({
          by: ["status"],
          where: { batchId: { in: ids } },
          _count: { status: true },
        })
      }),

      prisma.batch.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          emailAccount: { select: { email: true } },
          template: { select: { name: true } },
          _count: { select: { batchRecipients: true } },
        },
      }),

      prisma.reply.findMany({
        where: { batchRecipient: { batch: { userId } } },
        take: 6,
        orderBy: { receivedAt: "desc" },
        include: {
          batchRecipient: {
            include: {
              recipient: { select: { companyName: true, position: true, hrEmail: true } },
              batch: { select: { name: true } },
            },
          },
        },
      }),

      prisma.batch.findMany({
        where: { userId, status: "RUNNING" },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { batchRecipients: true } },
        },
      }).then(async (batches) => {
        return Promise.all(
          batches.map(async (b) => {
            const counts = await prisma.batchRecipient.groupBy({
              by: ["status"],
              where: { batchId: b.id },
              _count: { status: true },
            })
            const total = b._count.batchRecipients
            const done = counts
              .filter((c) => !["PENDING", "DRAFT"].includes(c.status))
              .reduce((sum, c) => sum + c._count.status, 0)
            return { ...b, progress: total > 0 ? Math.round((done / total) * 100) : 0 }
          })
        )
      }),

      prisma.batch.findMany({
        where: { userId, status: "SCHEDULED", scheduledAt: { not: null } },
        take: 5,
        orderBy: { scheduledAt: "asc" },
        include: {
          emailAccount: { select: { email: true } },
          template: { select: { name: true } },
          _count: { select: { batchRecipients: true } },
        },
      }),

      prisma.activityLog.findMany({
        where: { userId },
        take: 6,
        orderBy: { createdAt: "desc" },
        select: { id: true, eventType: true, message: true, createdAt: true, batchId: true },
      }),

      prisma.reply.findMany({
        where: { batchRecipient: { batch: { userId } }, isLikelyAutomated: false },
        orderBy: { receivedAt: "desc" },
      }).then((replies) => {
        const threadIds = new Set<string>()
        for (const r of replies) {
          if (r.gmailThreadId) threadIds.add(r.gmailThreadId)
        }
        return threadIds.size
      }),
    ])

    const statusMap: Record<string, number> = {}
    batchRecipientsStats.forEach((item) => {
      statusMap[item.status] = item._count.status
    })

    const totalSent = statusMap["SENT"] || 0
    const totalReplies =
      (statusMap["REPLY"] || 0) +
      (statusMap["INTERVIEW"] || 0) +
      (statusMap["TECHNICAL_TEST"] || 0) +
      (statusMap["HR_INTERVIEW"] || 0) +
      (statusMap["OFFERING"] || 0) +
      (statusMap["ACCEPTED"] || 0)

    const totalFailed = statusMap["FAILED"] || 0
    const replyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : "0.0"

    return apiSuccess({
      metrics: {
        totalBatches,
        activeBatches,
        totalRecipients,
        totalEmailAccounts,
        totalSent,
        totalReplies,
        totalFailed,
        replyRate,
        totalReplyThreads: replyThreads,
      },
      recentBatches,
      recentReplies,
      runningBatches,
      upcomingBatches,
      recentActivity,
    })
  })
}
