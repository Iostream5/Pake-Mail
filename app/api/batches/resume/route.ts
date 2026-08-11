import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"
import { emailQueue } from "@/lib/queue"

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { id } = await request.json()
    const batch = await prisma.batch.findFirst({
      where: { id, userId },
      include: {
        batchRecipients: {
          where: { status: { in: ["PENDING", "RETRY"] } },
          include: { recipient: true },
        },
        batchDocuments: true,
      },
    })

    if (!batch) return apiError("Batch not found", 404)
    if (batch.status !== "PAUSED") return apiError("Can only resume a paused batch")

    const pendingRecipients = batch.batchRecipients
    if (pendingRecipients.length === 0) {
      await prisma.batch.update({ where: { id }, data: { status: "COMPLETED" } })
      return apiSuccess({ status: "COMPLETED" })
    }

    const documentIds = batch.batchDocuments.map((bd) => bd.documentId)

    const jobs = pendingRecipients.map((br, i) => ({
      name: `send:${br.id}`,
      data: {
        batchRecipientId: br.id,
        batchId: batch.id,
        recipientId: br.recipientId,
        emailAccountId: batch.emailAccountId,
        templateId: batch.templateId,
        documentIds,
        userId,
      },
      opts: {
        jobId: `send:${br.id}`,
        delay: i * (batch.delaySeconds * 1000),
        attempts: batch.retryMax + 1,
      },
    }))

    await emailQueue.addBulk(jobs)

    await prisma.batch.update({ where: { id }, data: { status: "RUNNING" } })

    return apiSuccess({ status: "RUNNING" })
  })
}
