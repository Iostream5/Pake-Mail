import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess } from "@/lib/api-helpers"

export async function GET(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unread") === "true"

    const where: any = { userId }
    if (unreadOnly) where.isRead = false

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    })

    return apiSuccess({ notifications, unreadCount })
  })
}
