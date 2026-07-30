import { prisma } from "@/lib/prisma"

export interface TemplateStats {
  sentCount: number
  replyCount: number
  replyRate: number | null
}

export async function getTemplateStats(templateId: string): Promise<TemplateStats> {
  const recipients = await prisma.batchRecipient.findMany({
    where: {
      batch: { templateId },
      status: { not: "PENDING" },
    },
    select: { status: true },
  })

  const sentCount = recipients.length
  const replyStatuses = ["REPLY", "INTERVIEW", "TECHNICAL_TEST", "HR_INTERVIEW", "OFFERING", "ACCEPTED"]
  const replyCount = recipients.filter((r) => replyStatuses.includes(r.status)).length
  const replyRate = sentCount >= 10 ? (replyCount / sentCount) * 100 : null

  return { sentCount, replyCount, replyRate }
}

export async function getBulkTemplateStats(templateIds: string[]): Promise<Map<string, TemplateStats>> {
  if (templateIds.length === 0) return new Map()

  const batches = await prisma.batch.findMany({
    where: { templateId: { in: templateIds } },
    select: { id: true, templateId: true },
  })

  const batchIdsByTemplate = new Map<string, string[]>()
  for (const b of batches) {
    const list = batchIdsByTemplate.get(b.templateId) ?? []
    list.push(b.id)
    batchIdsByTemplate.set(b.templateId, list)
  }

  const allBatchIds = batches.map((b) => b.id)
  if (allBatchIds.length === 0) return new Map()

  const groups = await prisma.batchRecipient.groupBy({
    by: ["status", "batchId"],
    where: { batchId: { in: allBatchIds }, status: { not: "PENDING" } },
    _count: { status: true },
  })

  const replyStatuses = ["REPLY", "INTERVIEW", "TECHNICAL_TEST", "HR_INTERVIEW", "OFFERING", "ACCEPTED"]

  const result = new Map<string, TemplateStats>()

  for (const templateId of templateIds) {
    const bIds = batchIdsByTemplate.get(templateId) ?? []
    let sentCount = 0
    let replyCount = 0

    for (const g of groups) {
      if (bIds.includes(g.batchId)) {
        sentCount += g._count.status
        if (replyStatuses.includes(g.status)) {
          replyCount += g._count.status
        }
      }
    }

    const replyRate = sentCount >= 10 ? (replyCount / sentCount) * 100 : null
    result.set(templateId, { sentCount, replyCount, replyRate })
  }

  return result
}
