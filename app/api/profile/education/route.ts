import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const profile = await prisma.profile.findUnique({ where: { userId } })
    if (!profile) return apiError("Create profile first")

    const count = await prisma.education.count({ where: { profileId: profile.id } })
    if (count >= 5) return apiError("Maksimal 5 data pendidikan", 400)

    const body = await request.json()
    const education = await prisma.education.create({
      data: { ...body, profileId: profile.id },
    })

    return apiSuccess(education, 201)
  })
}

export async function PUT(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { id, ...data } = await request.json()
    const education = await prisma.education.findFirst({
      where: { id, profile: { userId } },
    })
    if (!education) return apiError("Not found", 404)

    const updated = await prisma.education.update({ where: { id }, data })
    return apiSuccess(updated)
  })
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return apiError("Education ID required")

    const education = await prisma.education.findFirst({
      where: { id, profile: { userId } },
    })
    if (!education) return apiError("Not found", 404)

    await prisma.education.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  })
}
