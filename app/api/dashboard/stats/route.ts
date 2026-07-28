import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess } from "@/lib/api-helpers"

export async function GET() {
  return handleApi(async () => {
    const userId = await requireUserId()

    // 1. Fetch Metrics & Stats
    const [
      totalBatches,
      activeBatches,
      totalRecipients,
      totalEmailAccounts,
      batchRecipientsStats,
      recentBatches,
      recentReplies,
    ] = await Promise.all([
      prisma.batch.count({ where: { userId } }),
      prisma.batch.count({
        where: { userId, status: { in: ["RUNNING", "SCHEDULED"] } },
      }),
      prisma.recipient.count({ where: { userId } }),
      prisma.emailAccount.count({ where: { userId } }),

      // Aggregation of batch recipient statuses
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

      // Recent Batches (Campaigns)
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

      // Recent Replies / Status updates from companies
      prisma.batchRecipient.findMany({
        where: {
          batch: { userId },
          status: { in: ["REPLY", "INTERVIEW", "TECHNICAL_TEST", "HR_INTERVIEW", "OFFERING", "ACCEPTED"] },
        },
        take: 8,
        orderBy: { updatedAt: "desc" },
        include: {
          recipient: true,
          batch: { select: { name: true } },
        },
      }),
    ])

    // Process status counts
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
      },
      recentBatches,
      recentReplies,
    })
  })
}
