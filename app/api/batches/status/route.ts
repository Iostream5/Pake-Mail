import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

const VALID_STATUSES = ["APPLIED", "REPLY", "INTERVIEW", "TECHNICAL_TEST", "HR_INTERVIEW", "OFFERING", "ACCEPTED", "REJECTED"]

export async function PUT(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { batchRecipientId, status } = await request.json()
    if (!VALID_STATUSES.includes(status)) {
      return apiError(`Invalid status. Valid: ${VALID_STATUSES.join(", ")}`)
    }

    const br = await prisma.batchRecipient.findFirst({
      where: { id: batchRecipientId, batch: { userId } },
    })
    if (!br) return apiError("Batch recipient not found", 404)

    const updated = await prisma.batchRecipient.update({
      where: { id: batchRecipientId },
      data: { status: status as any },
    })

    await prisma.activityLog.create({
      data: {
        userId,
        batchId: br.batchId,
        batchRecipientId,
        eventType: "STATUS_UPDATE",
        message: `Status changed to ${status}`,
      },
    })

    return apiSuccess(updated)
  })
}
