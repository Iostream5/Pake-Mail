import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess } from "@/lib/api-helpers"

export async function PATCH() {
  return handleApi(async () => {
    const userId = await requireUserId()

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })

    return apiSuccess({ success: true })
  })
}
