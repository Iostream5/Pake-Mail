import { prisma } from "@/lib/prisma"
import { emailQueue } from "@/lib/queue"

export async function updateBatchProgress(batchId: string): Promise<void> {
  const counts = await prisma.batchRecipient.groupBy({
    by: ['status'],
    where: { batchId },
    _count: true,
  })

  const statusCounts: Record<string, number> = {}
  for (const c of counts) {
    statusCounts[c.status] = c._count
  }

  const pendingCount = statusCounts["PENDING"] ?? 0
  const retryCount = statusCounts["RETRY"] ?? 0
  const sentCount = statusCounts["SENT"] ?? 0
  const failedCount = statusCounts["FAILED"] ?? 0

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { status: true, userId: true, autoStopThreshold: true }
  })
  if (!batch) return

  // Check Auto-Stop first if the batch is RUNNING
  const processed = sentCount + failedCount
  if (batch.status === "RUNNING" && processed >= 10) {
    const failureRatio = failedCount / processed
    if (failureRatio >= batch.autoStopThreshold) {
      // Re-read batch status to ensure we don't run cleanup twice
      const freshBatch = await prisma.batch.findUnique({
        where: { id: batchId },
        select: { status: true }
      })
      if (freshBatch && freshBatch.status === "RUNNING") {
        await prisma.batch.update({
          where: { id: batchId },
          data: { status: "STOPPED" },
        })

        const remainingRecipients = await prisma.batchRecipient.findMany({
          where: {
            batchId,
            status: { in: ["PENDING", "RETRY"] }
          },
          select: { id: true }
        })

        const removals = remainingRecipients.map((br) =>
          emailQueue.remove(`send:${br.id}`).catch(() => {})
        )
        await Promise.all(removals)

        await prisma.batchRecipient.updateMany({
          where: {
            batchId,
            status: { in: ["PENDING", "RETRY"] }
          },
          data: { status: "SKIPPED" },
        })

        await prisma.activityLog.create({
          data: {
            userId: batch.userId,
            batchId,
            eventType: "BATCH_STOPPED_AUTO",
            message: `Batch dihentikan otomatis karena tingkat kegagalan (${(failureRatio * 100).toFixed(0)}%) melebihi ambang batas (${(batch.autoStopThreshold * 100).toFixed(0)}%).`,
          }
        })
        return // Stop processing further transitions
      }
    }
  }

  // Handle completion transition
  if (pendingCount === 0 && retryCount === 0 && batch.status === "RUNNING") {
    await prisma.batch.update({
      where: { id: batchId },
      data: { status: "COMPLETED" },
    })
    await prisma.activityLog.create({
      data: {
        userId: batch.userId,
        batchId,
        eventType: "BATCH_COMPLETED",
        message: "Pengiriman batch selesai.",
      }
    })
  }
}
