import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { batchId, documentIds } = await request.json()
    const batch = await prisma.batch.findFirst({ where: { id: batchId, userId } })
    if (!batch) return apiError("Batch not found", 404)

    const batchDocuments = await Promise.all(
      documentIds.map((documentId: string) =>
        prisma.batchDocument.upsert({
          where: { batchId_documentId: { batchId, documentId } },
          create: { batchId, documentId },
          update: {},
        })
      )
    )

    return apiSuccess(batchDocuments, 201)
  })
}
