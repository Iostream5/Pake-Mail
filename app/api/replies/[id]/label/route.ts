import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const userId = await requireUserId()
    const { id } = await params

    const reply = await prisma.reply.findUnique({
      where: { id },
      include: { batchRecipient: { include: { batch: { select: { userId: true } } } } },
    })

    if (!reply || reply.batchRecipient.batch.userId !== userId) {
      return apiError("Reply not found", 404)
    }

    const body = await request.json()
    const { userLabel } = body as { userLabel: string | null }

    const updated = await prisma.reply.update({
      where: { id },
      data: { userLabel: userLabel || null },
    })

    return apiSuccess(updated)
  })
}
