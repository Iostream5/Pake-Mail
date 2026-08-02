import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function GET(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { searchParams } = new URL(request.url)
    const section = searchParams.get("section")
    const q = searchParams.get("q")
    const sort = searchParams.get("sort")
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "50")))

    const where: any = {
      batchRecipient: { batch: { userId } },
    }

    if (section === "review") {
      where.confidenceTier = { in: ["POSSIBLE", "INDIKASI"] }
      where.isConfirmedByUser = false
    } else if (section === "confirmed") {
      where.confidenceTier = { in: ["CONFIRMED", "LIKELY"] }
    }

    if (q) {
      where.OR = [
        { snippet: { contains: q, mode: "insensitive" } },
        { senderEmail: { contains: q, mode: "insensitive" } },
        { batchRecipient: { recipient: { companyName: { contains: q, mode: "insensitive" } } } },
      ]
    }

    const orderBy = sort === "oldest" ? { receivedAt: "asc" as const } : { receivedAt: "desc" as const }

    const [replies, total] = await Promise.all([
      prisma.reply.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          batchRecipient: {
            include: {
              recipient: { select: { companyName: true, hrEmail: true, position: true } },
              batch: { select: { name: true } },
            },
          },
        },
      }),
      prisma.reply.count({ where }),
    ])

    return apiSuccess({
      replies,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  })
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()
    const body = await request.json()
    const { id, action } = body

    if (!id || !action) return apiError("id and action required", 400)

    const reply = await prisma.reply.findFirst({
      where: { id, batchRecipient: { batch: { userId } } },
    })
    if (!reply) return apiError("Reply not found", 404)

    if (action === "confirm") {
      await prisma.reply.update({
        where: { id },
        data: { isConfirmedByUser: true },
      })
      await prisma.batchRecipient.update({
        where: { id: reply.batchRecipientId },
        data: { status: "REPLY" },
      })
      return apiSuccess({ confirmed: true })
    }

    if (action === "label") {
      if (!body.label) return apiError("label required", 400)
      await prisma.reply.update({
        where: { id },
        data: { userLabel: body.label },
      })
      return apiSuccess({ labeled: true })
    }

    if (action === "dismiss") {
      await prisma.reply.update({
        where: { id },
        data: { isConfirmedByUser: true },
      })
      return apiSuccess({ dismissed: true })
    }

    return apiError("Unknown action", 400)
  })
}
