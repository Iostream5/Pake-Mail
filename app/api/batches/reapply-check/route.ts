import { requireUserId, handleApi, apiSuccess } from "@/lib/api-helpers"
import { checkReapply } from "@/lib/reapply-check"

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()
    const { hrEmails } = await request.json() as { hrEmails: string[] }

    if (!Array.isArray(hrEmails) || hrEmails.length === 0) {
      return apiSuccess({ warnings: [] })
    }

    const warnings = await checkReapply(userId, hrEmails)
    return apiSuccess({ warnings })
  })
}
