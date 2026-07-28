import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"
import { getSignedFileUrl } from "@/lib/storage"

export async function GET(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return apiError("Document ID required")

    const doc = await prisma.document.findFirst({ where: { id, userId } })
    if (!doc) return apiError("Not found", 404)

    const url = await getSignedFileUrl(doc.fileUrl, 300)
    return apiSuccess({ url, name: doc.name, category: doc.category })
  })
}
