import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

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
