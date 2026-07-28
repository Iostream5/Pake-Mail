import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function GET(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { searchParams } = new URL(request.url)
    const recipientId = searchParams.get("recipientId")
    if (!recipientId) return apiError("recipientId required")

    const recipient = await prisma.recipient.findFirst({ where: { id: recipientId, userId } })
    if (!recipient) return apiError("Recipient not found", 404)

    const batchRecipients = await prisma.batchRecipient.findMany({
      where: { recipientId },
      include: {
        batch: {
          select: { id: true, name: true, status: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    return apiSuccess({
      recipient: { companyName: recipient.companyName, hrEmail: recipient.hrEmail },
      history: batchRecipients.map((br) => ({
        batchId: br.batch.id,
        batchName: br.batch.name,
        batchStatus: br.batch.status,
        batchCreatedAt: br.batch.createdAt,
        status: br.status,
        sentAt: br.sentAt,
        errorLog: br.errorLog,
      })),
    })
  })
}
