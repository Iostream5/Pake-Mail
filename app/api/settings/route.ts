import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"
import { validateResendSettings, GUARD_RAIL } from "@/lib/resend"

export async function GET() {
  return handleApi(async () => {
    const userId = await requireUserId()

    let settings = await prisma.settings.findUnique({ where: { userId } })

    if (!settings) {
      settings = await prisma.settings.create({
        data: { userId },
      })
    }

    return apiSuccess(settings)
  })
}

export async function PUT(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()
    const body = await request.json()

    const thresholdDays =
      body.resendThresholdDaysDefault ?? GUARD_RAIL.DEFAULT_THRESHOLD_DAYS
    const maxCount =
      body.resendMaxCountDefault ?? GUARD_RAIL.DEFAULT_MAX_COUNT

    const guard = validateResendSettings(thresholdDays, maxCount)
    if (!guard.valid) return apiError(guard.error, 422)

    const settings = await prisma.settings.upsert({
      where: { userId },
      update: {
        resendEnabledDefault: body.resendEnabledDefault,
        resendThresholdDaysDefault: thresholdDays,
        resendMaxCountDefault: maxCount,
        resendApprovalWindowHours:
          body.resendApprovalWindowHours ?? GUARD_RAIL.DEFAULT_APPROVAL_WINDOW_HOURS,
        reapplyWindowDays: body.reapplyWindowDays ?? 30,
      },
      create: {
        userId,
        resendEnabledDefault: body.resendEnabledDefault ?? false,
        resendThresholdDaysDefault: thresholdDays,
        resendMaxCountDefault: maxCount,
        resendApprovalWindowHours:
          body.resendApprovalWindowHours ?? GUARD_RAIL.DEFAULT_APPROVAL_WINDOW_HOURS,
        reapplyWindowDays: body.reapplyWindowDays ?? 30,
      },
    })

    return apiSuccess(settings)
  })
}
