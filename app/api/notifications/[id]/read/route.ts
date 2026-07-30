import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const userId = await requireUserId()
    const { id } = await params

    const notif = await prisma.notification.findFirst({ where: { id, userId } })
    if (!notif) return apiError("Not found", 404)

    await prisma.notification.update({ where: { id }, data: { isRead: true } })
    return apiSuccess({ success: true })
  })
}
