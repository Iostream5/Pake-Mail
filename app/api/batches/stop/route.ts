import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { id } = await request.json()
    const batch = await prisma.batch.findFirst({ where: { id, userId } })
    if (!batch) return apiError("Batch not found", 404)
    if (!["RUNNING", "PAUSED", "SCHEDULED"].includes(batch.status)) {
      return apiError("Batch is not active")
    }

    await prisma.batchRecipient.updateMany({
      where: { batchId: id, status: "PENDING" },
      data: { status: "SKIPPED" },
    })

    await prisma.batch.update({ where: { id }, data: { status: "STOPPED" } })

    return apiSuccess({ status: "STOPPED" })
  })
}
