import { prisma } from "@/lib/prisma"
import { resendTriggerQueue } from "@/lib/queue"
import { getEffectiveSettings, shouldAutoResend } from "@/lib/resend"

const TRIGGER_INTERVAL_MS = 30 * 60 * 1000

export async function processResendTrigger() {
  console.log("[ResendTrigger] Starting evaluation cycle...")
  const start = Date.now()

  const batches = await prisma.batch.findMany({
    where: { status: { in: ["COMPLETED", "RUNNING", "SCHEDULED"] } },
    include: { user: true },
  })

  let scheduled = 0
  let skipped = 0

  for (const batch of batches) {
    try {
      const settings = await getEffectiveSettings(batch.userId, batch)
      if (!settings.resendEnabled) {
        skipped++
        continue
      }

      const recipients = await prisma.batchRecipient.findMany({
        where: {
          batchId: batch.id,
          status: { in: ["SENT", "APPLIED"] },
          sentAt: { not: null },
          resendCount: { lt: settings.resendMaxCount },
          nextResendScheduledAt: null,
        },
        include: {
          recipient: { select: { companyName: true, hrEmail: true } },
        },
      })

      for (const br of recipients) {
        if (!shouldAutoResend(br, settings.resendThresholdDays, settings.resendMaxCount)) continue

        const existingSchedule = await prisma.resendSchedule.findFirst({
          where: {
            batchRecipientId: br.id,
            status: "PENDING_APPROVAL",
          },
        })
        if (existingSchedule) continue

        const scheduledSendAt = new Date(
          Date.now() + settings.approvalWindowHours * 60 * 60 * 1000
        )

        await prisma.resendSchedule.create({
          data: {
            batchRecipientId: br.id,
            scheduledSendAt,
            status: "PENDING_APPROVAL",
          },
        })

        await prisma.batchRecipient.update({
          where: { id: br.id },
          data: { nextResendScheduledAt: scheduledSendAt },
        })

        await prisma.notification.create({
          data: {
            userId: batch.userId,
            type: "resend_pending",
            title: `Resend otomatis akan dikirim ke ${br.recipient.companyName}`,
            body: `Dijadwalkan pada ${scheduledSendAt.toLocaleString("id-ID")}. Batalkan jika diperlukan.`,
            refId: br.id,
          },
        })

        scheduled++
      }
    } catch (err) {
      console.error(`[ResendTrigger] Error processing batch ${batch.id}:`, err instanceof Error ? err.message : err)
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`[ResendTrigger] Cycle done: ${scheduled} scheduled, ${skipped} batches skipped in ${elapsed}s`)

  await scheduleNextResendTrigger()
  return { scheduled, skipped }
}

export async function scheduleNextResendTrigger() {
  const jobs = await resendTriggerQueue.getRepeatableJobs()
  const existing = jobs.find((j) => j.name === "resend-trigger")

  if (!existing) {
    await resendTriggerQueue.upsertJobScheduler(
      "resend-trigger",
      { every: TRIGGER_INTERVAL_MS },
      { name: "resend-trigger", data: {} }
    )
    console.log(`[ResendTrigger] Scheduled every ${TRIGGER_INTERVAL_MS / 60000}min`)
  }
}
