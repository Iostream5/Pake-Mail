import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function GET(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const documents = await prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })

    return apiSuccess(documents)
  })
}

export async function PUT(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const formData = await request.formData()
    const id = formData.get("id") as string
    const file = formData.get("file") as File | null
    const name = formData.get("name") as string | null
    const category = formData.get("category") as string | null

    if (!id) return apiError("Document ID required")

    const doc = await prisma.document.findFirst({ where: { id, userId } })
    if (!doc) return apiError("Not found", 404)

    const data: any = {}
    if (name) data.name = name
    if (category) data.category = category

    if (file) {
      const { uploadFile } = await import("@/lib/storage")
      const ext = "." + file.name.split(".").pop()?.toLowerCase()
      const ALLOWED_TYPES = (process.env.ALLOWED_FILE_TYPES ?? ".pdf,.docx,.jpg,.png").split(",")
      if (!ALLOWED_TYPES.includes(ext)) {
        return apiError(`File type ${ext} not allowed`)
      }
      const MAX_SIZE = (Number(process.env.MAX_FILE_SIZE_MB) ?? 10) * 1024 * 1024
      if (file.size > MAX_SIZE) {
        return apiError(`File too large. Max ${MAX_SIZE / 1024 / 1024}MB`)
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      const key = `documents/${userId}/${Date.now()}-${file.name}`
      await uploadFile(key, buffer, file.type || "application/octet-stream")

      data.fileUrl = key
      data.fileSizeKb = Math.round(file.size / 1024)
      data.version = doc.version + 1
    }

    const updated = await prisma.document.update({ where: { id }, data })
    return apiSuccess(updated)
  })
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return apiError("Document ID required")

    const doc = await prisma.document.findFirst({ where: { id, userId } })
    if (!doc) return apiError("Not found", 404)

    const activeBatches = await prisma.batchDocument.count({
      where: { documentId: id, batch: { status: { in: ["RUNNING", "SCHEDULED"] } } },
    })
    if (activeBatches > 0) {
      return apiError("Document is used in active batches. Stop or complete them first.", 409)
    }

    await prisma.document.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  })
}
