import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function GET(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { educations: true, experiences: true },
    })

    return apiSuccess(profile ?? {})
  })
}

export async function PUT(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const body = await request.json()
    const { fullName, phone, email, linkedinUrl, portfolioUrl, address, birthDate } = body

    const profile = await prisma.profile.upsert({
      where: { userId },
      create: { userId, fullName, phone, email, linkedinUrl, portfolioUrl, address, birthDate: birthDate ? new Date(birthDate) : undefined },
      update: { fullName, phone, email, linkedinUrl, portfolioUrl, address, birthDate: birthDate ? new Date(birthDate) : undefined },
    })

    return apiSuccess(profile)
  })
}
