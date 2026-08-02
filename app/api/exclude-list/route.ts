import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function GET() {
  return handleApi(async () => {
    const userId = await requireUserId()
    const entries = await prisma.excludeListEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, pattern: true, createdAt: true },
    })
    return apiSuccess(entries)
  })
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()
    const { pattern } = await request.json()
    if (!pattern || typeof pattern !== "string") return apiError("Pattern required", 400)

    const entry = await prisma.excludeListEntry.create({
      data: { userId, pattern: pattern.toLowerCase().trim() },
      select: { id: true, pattern: true, createdAt: true },
    })
    return apiSuccess(entry, 201)
  })
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return apiError("id required", 400)

    const entry = await prisma.excludeListEntry.findFirst({ where: { id, userId } })
    if (!entry) return apiError("Not found", 404)

    await prisma.excludeListEntry.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  })
}
