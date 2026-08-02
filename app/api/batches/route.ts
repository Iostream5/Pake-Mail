import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"
import { validateResendSettings, GUARD_RAIL } from "@/lib/resend"

export async function GET(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const batches = await prisma.batch.findMany({
      where: { userId },
      include: {
        emailAccount: { select: { email: true, provider: true } },
        template: { select: { name: true } },
        _count: {
          select: {
            batchRecipients: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return apiSuccess(batches)
  })
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const body = await request.json()

    if (body.resendThresholdDaysOverride || body.resendMaxCountOverride) {
      const guard = validateResendSettings(
        body.resendThresholdDaysOverride ?? GUARD_RAIL.DEFAULT_THRESHOLD_DAYS,
        body.resendMaxCountOverride ?? GUARD_RAIL.DEFAULT_MAX_COUNT
      )
      if (!guard.valid) return apiError(guard.error, 422)
    }

    const batch = await prisma.batch.create({
      data: {
        userId,
        emailAccountId: body.emailAccountId,
        templateId: body.templateId,
        name: body.name,
        description: body.description,
        delaySeconds: body.delaySeconds ?? Number(process.env.DEFAULT_DELAY_SECONDS) ?? 45,
        activeHoursStart: body.activeHoursStart ?? process.env.DEFAULT_ACTIVE_HOURS_START ?? "08:00",
        activeHoursEnd: body.activeHoursEnd ?? process.env.DEFAULT_ACTIVE_HOURS_END ?? "17:00",
        activeDays: body.activeDays ?? process.env.DEFAULT_ACTIVE_DAYS ?? "1,2,3,4,5",
        retryMax: body.retryMax ?? Number(process.env.DEFAULT_RETRY_MAX) ?? 2,
        autoStopThreshold: (body.autoStopThreshold ?? Number(process.env.DEFAULT_AUTO_STOP_THRESHOLD) ?? 30) / 100,
        resendEnabledOverride: body.resendEnabledOverride ?? null,
        resendThresholdDaysOverride: body.resendThresholdDaysOverride ?? null,
        resendMaxCountOverride: body.resendMaxCountOverride ?? null,
        status: "DRAFT",
      },
      include: {
        emailAccount: { select: { email: true } },
        template: { select: { name: true } },
      },
    })

    return apiSuccess(batch, 201)
  })
}

export async function PUT(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { id, ...data } = await request.json()

    if (data.resendThresholdDaysOverride || data.resendMaxCountOverride) {
      const guard = validateResendSettings(
        data.resendThresholdDaysOverride ?? GUARD_RAIL.DEFAULT_THRESHOLD_DAYS,
        data.resendMaxCountOverride ?? GUARD_RAIL.DEFAULT_MAX_COUNT
      )
      if (!guard.valid) return apiError(guard.error, 422)
    }

    const batch = await prisma.batch.findFirst({ where: { id, userId } })
    if (!batch) return apiError("Batch not found", 404)

    const updated = await prisma.batch.update({ where: { id }, data })
    return apiSuccess(updated)
  })
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return apiError("Batch ID required")

    const batch = await prisma.batch.findFirst({ where: { id, userId } })
    if (!batch) return apiError("Not found", 404)
    if (!["DRAFT", "STOPPED", "FAILED", "COMPLETED"].includes(batch.status)) {
      return apiError("Cannot delete a running/scheduled batch. Stop it first.", 409)
    }

    await prisma.batch.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  })
}
