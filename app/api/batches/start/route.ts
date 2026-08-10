import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"
import { emailQueue } from "@/lib/queue"
import { redis } from "@/lib/redis"

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { id } = await request.json()
    const batch = await prisma.batch.findFirst({
      where: { id, userId },
      include: {
        batchRecipients: { include: { recipient: true } },
        batchDocuments: true,
        emailAccount: true,
        template: true,
      },
    })

    if (!batch) return apiError("Batch not found", 404)
    if (!["DRAFT", "SCHEDULED", "RUNNING"].includes(batch.status)) {
      return apiError(`Cannot start batch with status ${batch.status}`)
    }

    const pendingRecipients = batch.batchRecipients.filter(
      (br) => br.status === "PENDING" || br.status === "RETRY"
    )

    if (pendingRecipients.length === 0) {
      return apiError("No pending or retryable recipients in this batch")
    }

    const redisStatus = redis.status
    if (redisStatus !== "ready" && redisStatus !== "connecting") {
      return apiError("Redis is not available. Cannot start batch without a Redis connection.", 503)
    }

    const now = new Date()
    const scheduledAt = batch.scheduledAt ?? now

    // Queue all pending/retry recipients using addBulk
    const jobs = pendingRecipients.map((br, i) => {
      const delayMs = scheduledAt.getTime() - now.getTime() + i * (batch.delaySeconds * 1000)
      return {
        name: "send",
        data: {
          batchRecipientId: br.id,
          batchId: batch.id,
          recipientId: br.recipientId,
          emailAccountId: batch.emailAccountId,
          templateId: batch.templateId,
          documentIds: batch.batchDocuments.map((bd) => bd.documentId),
          userId,
        },
        opts: {
          jobId: `send:${br.id}`,
          delay: delayMs > 0 ? delayMs : 0,
          attempts: batch.retryMax + 1,
        },
      }
    })

    await emailQueue.addBulk(jobs)

    await prisma.batch.update({
      where: { id },
      data: {
        status: scheduledAt > now ? "SCHEDULED" : "RUNNING",
      },
    })

    return apiSuccess({
      started: true,
      totalRecipients: pendingRecipients.length,
      status: scheduledAt > now ? "SCHEDULED" : "RUNNING",
    })
  })
}
