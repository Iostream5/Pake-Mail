import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function PUT(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { id } = await request.json()

    await prisma.emailAccount.updateMany({
      where: { userId },
      data: { isDefault: false },
    })

    await prisma.emailAccount.update({
      where: { id },
      data: { isDefault: true },
    })

    return apiSuccess({ success: true })
  })
}
