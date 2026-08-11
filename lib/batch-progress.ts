import { prisma } from "@/lib/prisma"
import { emailQueue } from "@/lib/queue"

export const MIN_AUTO_STOP_SAMPLE = 10

export interface ProcessedCounts {
  SENT: number
  FAILED: number
}

export function computeAutoStopRatio(
  counts: ProcessedCounts,
  threshold: number,
  minSample = MIN_AUTO_STOP_SAMPLE
): boolean {
  const processed = counts.SENT + counts.FAILED
  if (processed < minSample) return false
  const ratio = processed > 0 ? counts.FAILED / processed : 0
  return ratio > threshold
}

export async function updateBatchProgress(batchId: string): Promise<void> {
  const groups = await prisma.batchRecipient.groupBy({
    by: ["status"],
    where: { batchId },
    _count: { _all: true },
  })

  const counts: Record<string, number> = {}
  for (const group of groups) {
    counts[group.status] = group._count._all
  }

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { id: true, userId: true, status: true, autoStopThreshold: true },
  })
  if (!batch || batch.status !== "RUNNING") return

  const failed = counts["FAILED"] ?? 0
  const sent = counts["SENT"] ?? 0

  if (computeAutoStopRatio({ SENT: sent, FAILED: failed }, batch.autoStopThreshold)) {
    const claimed = await prisma.batch.updateMany({
      where: { id: batchId, status: "RUNNING" },
      data: { status: "STOPPED" },
    })
    if (claimed.count === 0) return

    const remaining = await prisma.batchRecipient.findMany({
      where: { batchId, status: { in: ["PENDING", "RETRY"] } },
      select: { id: true },
    })

    if (remaining.length > 0) {
      await prisma.batchRecipient.updateMany({
        where: { batchId, status: { in: ["PENDING", "RETRY"] } },
        data: { status: "SKIPPED" },
      })
      await Promise.all(
        remaining.map((r) => emailQueue.remove(`send:${r.id}`).catch(() => {}))
      )
    }

    await prisma.activityLog.create({
      data: {
        userId: batch.userId,
        batchId,
        eventType: "BATCH_AUTO_STOPPED",
        message: `Batch dihentikan otomatis: rasio gagal ${
          processedPercent(failed, sent)
        }% melebihi ambang batas ${(batch.autoStopThreshold * 100).toFixed(0)}%`,
      },
    })
    return
  }

  const pending = counts["PENDING"] ?? 0
  const retry = counts["RETRY"] ?? 0
  if (pending > 0 || retry > 0) return

  const claimed = await prisma.batch.updateMany({
    where: { id: batchId, status: "RUNNING" },
    data: { status: "COMPLETED" },
  })
  if (claimed.count === 0) return

  await prisma.activityLog.create({
    data: {
      userId: batch.userId,
      batchId,
      eventType: "BATCH_COMPLETED",
      message: "Batch selesai, semua email berhasil diproses",
    },
  })
}

function processedPercent(failed: number, sent: number): string {
  const total = failed + sent
  return total > 0 ? ((failed / total) * 100).toFixed(1) : "0"
}
