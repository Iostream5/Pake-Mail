import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { id } = await request.json()
    const source = await prisma.emailTemplate.findFirst({ where: { id, userId } })
    if (!source) return apiError("Template not found", 404)

    const clone = await prisma.emailTemplate.create({
      data: {
        userId,
        name: `${source.name} (copy)`,
        subject: source.subject,
        body: source.body,
        closing: source.closing,
      },
    })

    return apiSuccess(clone, 201)
  })
}
