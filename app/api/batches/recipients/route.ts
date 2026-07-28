import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { batchId, recipientIds } = await request.json()
    const batch = await prisma.batch.findFirst({ where: { id: batchId, userId } })
    if (!batch) return apiError("Batch not found", 404)

    const batchRecipients = await Promise.all(
      recipientIds.map((recipientId: string) =>
        prisma.batchRecipient.upsert({
          where: { batchId_recipientId: { batchId, recipientId } },
          create: { batchId, recipientId },
          update: {},
        })
      )
    )

    return apiSuccess(batchRecipients, 201)
  })
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get("batchId")
    const recipientId = searchParams.get("recipientId")
    if (!batchId || !recipientId) return apiError("batchId and recipientId required")

    await prisma.batchRecipient.deleteMany({
      where: { batchId, recipientId, batch: { userId } },
    })

    return apiSuccess({ deleted: true })
  })
}
