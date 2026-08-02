import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function GET() {
  return handleApi(async () => {
    const userId = await requireUserId()

    const schedules = await prisma.resendSchedule.findMany({
      where: {
        status: "PENDING_APPROVAL",
        batchRecipient: {
          batch: { userId },
        },
      },
      include: {
        batchRecipient: {
          include: {
            recipient: {
              select: { id: true, companyName: true, hrEmail: true, position: true },
            },
            batch: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { scheduledSendAt: "asc" },
    })

    return apiSuccess(schedules)
  })
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const batchIdRaw = searchParams.get("batchId")

    if (!id && !batchIdRaw) {
      return apiError("Provide id (single) or batchId (bulk) to cancel", 400)
    }

    if (id) {
      const schedule = await prisma.resendSchedule.findFirst({
        where: { id, batchRecipient: { batch: { userId } } },
      })
      if (!schedule) return apiError("Schedule not found", 404)
      if (schedule.status !== "PENDING_APPROVAL") {
        return apiError("Schedule already processed", 409)
      }

      await prisma.resendSchedule.update({
        where: { id },
        data: { status: "CANCELLED" },
      })

      await prisma.batchRecipient.update({
        where: { id: schedule.batchRecipientId },
        data: { nextResendScheduledAt: null },
      })

      return apiSuccess({ cancelled: true })
    }

    const batchId: string = batchIdRaw!
    const batch = await prisma.batch.findFirst({ where: { id: batchId, userId } })
    if (!batch) return apiError("Batch not found", 404)

    const result = await prisma.resendSchedule.updateMany({
      where: {
        status: "PENDING_APPROVAL",
        batchRecipient: { batchId },
      },
      data: { status: "CANCELLED" },
    })

    await prisma.batchRecipient.updateMany({
      where: {
        batchId,
        nextResendScheduledAt: { not: null },
      },
      data: { nextResendScheduledAt: null },
    })

    return apiSuccess({ cancelled: result.count })
  })
}
