import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"
import { emailQueue } from "@/lib/queue"

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { id } = await request.json()
    const batch = await prisma.batch.findFirst({ where: { id, userId } })
    if (!batch) return apiError("Batch not found", 404)
    if (!["RUNNING", "PAUSED", "SCHEDULED"].includes(batch.status)) {
      return apiError("Batch is not active")
    }

    const pendingRecipients = await prisma.batchRecipient.findMany({
      where: {
        batchId: id,
        status: { in: ["PENDING", "RETRY"] },
      },
      select: { id: true },
    })

    const removals = pendingRecipients.map((br) =>
      emailQueue.remove(`send:${br.id}`).catch(() => {})
    )
    await Promise.all(removals)

    await prisma.batchRecipient.updateMany({
      where: {
        batchId: id,
        status: { in: ["PENDING", "RETRY"] },
      },
      data: { status: "SKIPPED" },
    })

    await prisma.batch.update({ where: { id }, data: { status: "STOPPED" } })

    return apiSuccess({ status: "STOPPED" })
  })
}
