import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"
import { getBulkTemplateStats } from "@/lib/template-stats"

export async function GET(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const templates = await prisma.emailTemplate.findMany({
      where: { userId },
      orderBy: [{ isFavorite: "desc" }, { createdAt: "desc" }],
    })

    const statsMap = await getBulkTemplateStats(templates.map((t) => t.id))

    const enriched = templates.map((t) => {
      const stats = statsMap.get(t.id) ?? { sentCount: 0, replyCount: 0, replyRate: null }
      return { ...t, ...stats }
    })

    return apiSuccess(enriched)
  })
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const body = await request.json()
    const template = await prisma.emailTemplate.create({
      data: { ...body, userId },
    })

    return apiSuccess(template, 201)
  })
}

export async function PUT(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { id, ...data } = await request.json()
    if (!id) return apiError("Template ID required")

    const template = await prisma.emailTemplate.findFirst({ where: { id, userId } })
    if (!template) return apiError("Not found", 404)

    const updated = await prisma.emailTemplate.update({ where: { id }, data })
    return apiSuccess(updated)
  })
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return apiError("Template ID required")

    const template = await prisma.emailTemplate.findFirst({ where: { id, userId } })
    if (!template) return apiError("Not found", 404)

    await prisma.emailTemplate.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  })
}
