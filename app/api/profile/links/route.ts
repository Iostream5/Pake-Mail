import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()
    const body = await request.json()
    const { name, url } = body

    if (!name || !url) return apiError("Nama dan URL harus diisi", 400)

    const profile = await prisma.profile.findUnique({ where: { userId } })
    if (!profile) return apiError("Buat profil terlebih dahulu", 400)

    const count = await prisma.profileLink.count({ where: { profileId: profile.id } })
    if (count >= 10) return apiError("Maksimal 10 link", 400)

    const maxOrder = await prisma.profileLink.aggregate({
      where: { profileId: profile.id },
      _max: { order: true },
    })

    const link = await prisma.profileLink.create({
      data: {
        profileId: profile.id,
        name,
        url,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    })

    return apiSuccess(link)
  })
}

export async function PUT(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()
    const body = await request.json()
    const { id, name, url } = body

    if (!id) return apiError("ID link diperlukan", 400)

    const existing = await prisma.profileLink.findUnique({
      where: { id },
      include: { profile: { select: { userId: true } } },
    })
    if (!existing || existing.profile.userId !== userId)
      return apiError("Link tidak ditemukan", 404)

    const link = await prisma.profileLink.update({
      where: { id },
      data: { name, url },
    })

    return apiSuccess(link)
  })
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) return apiError("ID link diperlukan", 400)

    const existing = await prisma.profileLink.findUnique({
      where: { id },
      include: { profile: { select: { userId: true } } },
    })
    if (!existing || existing.profile.userId !== userId)
      return apiError("Link tidak ditemukan", 404)

    await prisma.profileLink.delete({ where: { id } })

    return apiSuccess({ deleted: true })
  })
}
