import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"
import { emailQueue } from "@/lib/queue"
import { redis } from "@/lib/redis"

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    ),
  ])
}

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
  if (!["DRAFT", "SCHEDULED"].includes(batch.status)) {
    return apiError(`Cannot start batch with status ${batch.status}`)
  }

  const pendingRecipients = batch.batchRecipients.filter(
    (br) => br.status === "PENDING"
  )

  if (pendingRecipients.length === 0) {
    return apiError("No pending recipients in this batch")
  }

  const redisStatus = redis.status
  if (redisStatus !== "ready" && redisStatus !== "connecting") {
    return apiError("Redis is not available. Cannot start batch without a Redis connection.", 503)
  }

  const now = new Date()
  const scheduledAt = batch.scheduledAt ?? now

  // Queue all pending recipients
  for (let i = 0; i < pendingRecipients.length; i++) {
    const br = pendingRecipients[i]
    const delayMs = scheduledAt.getTime() - now.getTime() + i * (batch.delaySeconds * 1000)

    await withTimeout(
      emailQueue.add(
        `send-${br.id}`,
        {
          batchRecipientId: br.id,
          batchId: batch.id,
          recipientId: br.recipientId,
          emailAccountId: batch.emailAccountId,
          templateId: batch.templateId,
          documentIds: batch.batchDocuments.map((bd) => bd.documentId),
          userId,
        },
        {
          delay: delayMs > 0 ? delayMs : 0,
          attempts: batch.retryMax + 1,
        }
      ),
      10000
    )
  }

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
