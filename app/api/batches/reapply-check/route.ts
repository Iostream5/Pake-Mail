import { requireUserId, handleApi, apiSuccess } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { checkReapply } from "@/lib/reapply-check"

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()
    const { hrEmails } = await request.json() as { hrEmails: string[] }

    if (!Array.isArray(hrEmails) || hrEmails.length === 0) {
      return apiSuccess({ warnings: [] })
    }

    const settings = await prisma.settings.findUnique({ where: { userId } })
    const windowDays = settings?.reapplyWindowDays ?? 30

    const warnings = await checkReapply(userId, hrEmails, windowDays)
    return apiSuccess({ warnings })
  })
}
