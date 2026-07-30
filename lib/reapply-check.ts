import { prisma } from "@/lib/prisma"
import type { RecipientStatus } from "@prisma/client"

export interface ReapplyWarning {
  companyName: string
  hrEmail: string
  previousBatchName: string
  previousBatchId: string
  daysAgo: number
  previousStatus: string
}

const DEFAULT_REAPPLY_WINDOW_DAYS = 30

const EXCLUDED_STATUSES: RecipientStatus[] = ["REPLY", "INTERVIEW", "TECHNICAL_TEST", "HR_INTERVIEW", "OFFERING", "ACCEPTED"]

async function getRecipientByEmail(userId: string, hrEmail: string) {
  return prisma.recipient.findFirst({
    where: { userId, hrEmail },
    select: { id: true },
  })
}

export async function checkReapply(
  userId: string,
  hrEmails: string[],
  windowDays: number = DEFAULT_REAPPLY_WINDOW_DAYS
): Promise<ReapplyWarning[]> {
  if (hrEmails.length === 0) return []

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - windowDays)

  const recipients = await Promise.all(
    hrEmails.map((email) => getRecipientByEmail(userId, email))
  )
  const recipientIds = recipients.filter((r): r is { id: string } => r !== null).map((r) => r.id)
  if (recipientIds.length === 0) return []

  const recentRecipients = await prisma.batchRecipient.findMany({
    where: {
      recipientId: { in: recipientIds },
      sentAt: { gte: cutoff },
      status: { notIn: EXCLUDED_STATUSES },
    },
    include: {
      recipient: { select: { companyName: true, hrEmail: true } },
      batch: { select: { id: true, name: true } },
    },
    orderBy: { sentAt: "desc" },
  })

  const seen = new Set<string>()
  const warnings: ReapplyWarning[] = []

  for (const br of recentRecipients) {
    if (seen.has(br.recipient.hrEmail)) continue
    seen.add(br.recipient.hrEmail)

    const daysAgo = br.sentAt
      ? Math.floor((Date.now() - br.sentAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    warnings.push({
      companyName: br.recipient.companyName,
      hrEmail: br.recipient.hrEmail,
      previousBatchName: br.batch.name,
      previousBatchId: br.batch.id,
      daysAgo,
      previousStatus: br.status,
    })
  }

  return warnings
}
