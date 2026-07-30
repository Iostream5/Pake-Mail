import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess } from "@/lib/api-helpers"

export async function GET(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const q = searchParams.get("q")
    const sort = searchParams.get("sort")
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")))

    const where: any = {
      batchRecipient: {
        batch: { userId },
      },
    }

    if (type === "auto") where.isLikelyAutomated = true
    else if (type === "manual") where.isLikelyAutomated = false

    if (q) {
      where.OR = [
        { snippet: { contains: q, mode: "insensitive" } },
        { batchRecipient: { recipient: { companyName: { contains: q, mode: "insensitive" } } } },
      ]
    }

    const orderBy = sort === "oldest" ? { receivedAt: "asc" as const } : { receivedAt: "desc" as const }

    const [replies, total, autoCount, manualCount] = await Promise.all([
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
      prisma.reply.count({
        where: { ...where, isLikelyAutomated: true },
      }),
      prisma.reply.count({
        where: { ...where, isLikelyAutomated: false },
      }),
    ])

    return apiSuccess({
      replies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts: {
        auto: autoCount,
        manual: manualCount,
      },
    })
  })
}
