import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function GET(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") ?? ""
    const status = searchParams.get("status") ?? ""
    const tag = searchParams.get("tag") ?? ""

    const where: any = { userId }
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { hrEmail: { contains: search, mode: "insensitive" } },
        { position: { contains: search, mode: "insensitive" } },
      ]
    }
    if (status) where.status = status
    if (tag) where.tags = { contains: tag, mode: "insensitive" }

    const recipients = await prisma.recipient.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    return apiSuccess(recipients)
  })
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const body = await request.json()
    const { companyName, hrEmail, position, location, website, source, notes, tags } = body

    if (!companyName || !hrEmail) return apiError("Company name and HR email required")

    const existing = await prisma.recipient.findUnique({
      where: { userId_hrEmail: { userId, hrEmail } },
    })

    if (existing) {
      return apiSuccess({
        duplicate: true,
        message: "HR email already exists",
        existing: existing,
      })
    }

    const recipient = await prisma.recipient.create({
      data: { userId, companyName, hrEmail, position, location, website, source, notes, tags },
    })

    return apiSuccess(recipient, 201)
  })
}

export async function PUT(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { id, ...data } = await request.json()
    const recipient = await prisma.recipient.findFirst({ where: { id, userId } })
    if (!recipient) return apiError("Not found", 404)

    const updated = await prisma.recipient.update({ where: { id }, data })
    return apiSuccess(updated)
  })
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return apiError("Recipient ID required")

    const recipient = await prisma.recipient.findFirst({ where: { id, userId } })
    if (!recipient) return apiError("Not found", 404)

    await prisma.recipient.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  })
}
