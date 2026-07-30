import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const profile = await prisma.profile.findUnique({ where: { userId } })
    if (!profile) return apiError("Create profile first")

    const count = await prisma.experience.count({ where: { profileId: profile.id } })
    if (count >= 10) return apiError("Maksimal 10 data pengalaman", 400)

    const body = await request.json()
    const experience = await prisma.experience.create({
      data: { ...body, profileId: profile.id },
    })

    return apiSuccess(experience, 201)
  })
}

export async function PUT(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { id, ...data } = await request.json()
    const experience = await prisma.experience.findFirst({
      where: { id, profile: { userId } },
    })
    if (!experience) return apiError("Not found", 404)

    const updated = await prisma.experience.update({ where: { id }, data })
    return apiSuccess(updated)
  })
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return apiError("Experience ID required")

    const experience = await prisma.experience.findFirst({
      where: { id, profile: { userId } },
    })
    if (!experience) return apiError("Not found", 404)

    await prisma.experience.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  })
}
