import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const userId = await requireUserId()
    const { id } = await params

    const batch = await prisma.batch.findFirst({
      where: { id, userId },
      include: {
        emailAccount: { select: { email: true, provider: true } },
        template: { select: { name: true, subject: true } },
        batchDocuments: {
          include: { document: { select: { id: true, name: true, category: true } } },
        },
        batchRecipients: {
          include: {
            recipient: {
              select: { id: true, companyName: true, hrEmail: true, position: true },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
        activityLogs: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        _count: {
          select: { batchRecipients: true },
        },
      },
    })

    if (!batch) return apiError("Batch not found", 404)

    const stats = {
      total: batch.batchRecipients.length,
      pending: batch.batchRecipients.filter((r) => r.status === "PENDING").length,
      sent: batch.batchRecipients.filter((r) => r.status === "SENT").length,
      failed: batch.batchRecipients.filter((r) => r.status === "FAILED").length,
      skipped: batch.batchRecipients.filter((r) => r.status === "SKIPPED").length,
      retry: batch.batchRecipients.filter((r) => r.status === "RETRY").length,
    }

    return apiSuccess({ ...batch, stats })
  })
}
