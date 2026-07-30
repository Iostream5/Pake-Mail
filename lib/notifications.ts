import { prisma } from "@/lib/prisma"

export type NotificationType = "batch_completed" | "batch_failed" | "batch_stopped" | "new_reply"

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
  refId?: string
) {
  return prisma.notification.create({
    data: { userId, type, title, body, refId },
  })
}

const NOTIFICATION_TITLES: Record<string, string> = {
  APPLIED: "Status diubah ke Applied",
  REPLY: "Ada balasan baru!",
  INTERVIEW: "Status diubah ke Interview",
}

export async function notifyReplyDetected(
  userId: string,
  batchRecipientId: string,
  companyName: string,
  isAutomated: boolean
) {
  return createNotification(
    userId,
    "new_reply",
    isAutomated
      ? `Auto-reply dari ${companyName}`
      : `${companyName} membalas lamaran Anda`,
    undefined,
    batchRecipientId
  )
}

export async function notifyBatchCompleted(
  userId: string,
  batchId: string,
  batchName: string,
  sent: number,
  failed: number
) {
  return createNotification(
    userId,
    failed > 0 ? "batch_failed" : "batch_completed",
    failed > 0
      ? `Batch "${batchName}" selesai dengan ${failed} gagal`
      : `Batch "${batchName}" selesai — ${sent} terkirim`,
    undefined,
    batchId
  )
}
