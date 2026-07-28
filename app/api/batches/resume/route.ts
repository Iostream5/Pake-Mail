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
        where: { status: "PENDING" },
        include: { recipient: true },
      },
    },
  })

  if (!batch) return apiError("Batch not found", 404)
  if (batch.status !== "PAUSED") return apiError("Can only resume a paused batch")

  const pendingRecipients = batch.batchRecipients
  for (let i = 0; i < pendingRecipients.length; i++) {
    const br = pendingRecipients[i]
    await emailQueue.add(
      `send-${br.id}`,
      {
        batchRecipientId: br.id,
        batchId: batch.id,
        recipientId: br.recipientId,
        emailAccountId: batch.emailAccountId,
        templateId: batch.templateId,
        documentIds: [],
      },
      {
        delay: i * (batch.delaySeconds * 1000),
        attempts: batch.retryMax + 1,
      }
    )
  }

  await prisma.batch.update({ where: { id }, data: { status: "RUNNING" } })

  return apiSuccess({ status: "RUNNING" })
  })
}
