import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/encryption"
import { getSignedFileUrl } from "@/lib/storage"
import { categorizeError } from "@/lib/email-errors"
import { google } from "googleapis"
import { resendExecutionQueue } from "@/lib/queue"
import { getEffectiveSettings } from "@/lib/resend"

const EXECUTION_INTERVAL_MS = 5 * 60 * 1000

export async function processResendExecution() {
  console.log("[ResendExec] Starting execution cycle...")
  const start = Date.now()

  const schedules = await prisma.resendSchedule.findMany({
    where: {
      status: "PENDING_APPROVAL",
      scheduledSendAt: { lte: new Date() },
    },
    include: {
      batchRecipient: {
        include: {
          recipient: true,
          batch: {
            include: {
              emailAccount: true,
              template: true,
              batchDocuments: { include: { document: true } },
            },
          },
        },
      },
    },
  })

  if (schedules.length === 0) {
    console.log("[ResendExec] No schedules ready for execution")
    await scheduleNextResendExecution()
    return
  }

  let sent = 0
  let failed = 0

  for (const schedule of schedules) {
    const br = schedule.batchRecipient
    const batch = br.batch

    try {
      if (!["SENT", "APPLIED"].includes(br.status)) {
        await prisma.resendSchedule.update({
          where: { id: schedule.id },
          data: { status: "CANCELLED" },
        })
        continue
      }

      const user = await prisma.user.findUnique({ where: { id: batch.userId } })
      if (!user) continue

      const settings = await getEffectiveSettings(batch.userId, batch)
      if (br.resendCount >= settings.resendMaxCount) {
        await prisma.resendSchedule.update({
          where: { id: schedule.id },
          data: { status: "CANCELLED" },
        })
        continue
      }

      if (["STOPPED", "FAILED"].includes(batch.status)) {
        await prisma.resendSchedule.update({
          where: { id: schedule.id },
          data: { status: "CANCELLED" },
        })
        continue
      }

      const account = batch.emailAccount
      const template = batch.template
      const recipient = br.recipient

      const profile = await prisma.profile.findUnique({
        where: { userId: batch.userId },
        include: { educations: true, experiences: true },
      })
      if (!profile) {
        failed++
        continue
      }

      const tokens = JSON.parse(decrypt(account.oauthToken))
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      )
      oauth2Client.setCredentials(tokens)
      oauth2Client.on("tokens", async (newTokens) => {
        if (newTokens.refresh_token) {
          const { encrypt } = await import("@/lib/encryption")
          await prisma.emailAccount.update({
            where: { id: account.id },
            data: { oauthToken: encrypt(JSON.stringify({ ...tokens, ...newTokens })) },
          })
        }
      })

      const gmail = google.gmail({ version: "v1", auth: oauth2Client })

      const render = (text: string) =>
        text
          .replace(/\{\{full_name\}\}/g, profile.fullName)
          .replace(/\{\{phone\}\}/g, profile.phone ?? "")
          .replace(/\{\{email\}\}/g, profile.email ?? "")
          .replace(/\{\{portfolio\}\}/g, profile.portfolioUrl ?? "")
          .replace(/\{\{linkedin\}\}/g, profile.linkedinUrl ?? "")
          .replace(/\{\{address\}\}/g, profile.address ?? "")
          .replace(/\{\{company\}\}/g, recipient.companyName)
          .replace(/\{\{position\}\}/g, recipient.position ?? "")

      const subject = render(template.subject)
      const body = render(template.body + (template.closing ? `\n\n${render(template.closing)}` : ""))

      const missingVars = (subject + " " + body).match(/\{\{\w+\}\}/g)
      if (missingVars) {
        throw new Error(`Template contains unresolved variables: ${missingVars.join(", ")}`)
      }

      const attachments = []
      for (const bd of batch.batchDocuments) {
        const url = await getSignedFileUrl(bd.document.fileUrl)
        attachments.push({ url, filename: bd.document.name })
      }

      const boundary = `boundary${Date.now()}`
      const mimeParts = [
        `From: ${account.email}`,
        `To: ${recipient.hrEmail}`,
        `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
        "MIME-Version: 1.0",
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        "",
        `--${boundary}`,
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
        "",
        Buffer.from(body).toString("base64"),
      ]

      for (const attachment of attachments) {
        const response = await fetch(attachment.url)
        const fileBuffer = Buffer.from(await response.arrayBuffer())
        mimeParts.push(
          `--${boundary}`,
          `Content-Type: application/octet-stream`,
          'Content-Disposition: attachment; filename="=?UTF-8?B?' +
            Buffer.from(attachment.filename).toString("base64") +
            '?="',
          "Content-Transfer-Encoding: base64",
          "",
          fileBuffer.toString("base64")
        )
      }

      mimeParts.push(`--${boundary}--`)
      const raw = Buffer.from(mimeParts.join("\n"), "utf-8").toString("base64url")

      await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw },
      })

      await prisma.batchRecipient.update({
        where: { id: br.id },
        data: {
          resendCount: { increment: 1 },
          lastResendAt: new Date(),
          nextResendScheduledAt: null,
        },
      })

      await prisma.resendSchedule.update({
        where: { id: schedule.id },
        data: { status: "SENT" },
      })

      await prisma.activityLog.create({
        data: {
          userId: batch.userId,
          batchId: batch.id,
          batchRecipientId: br.id,
          eventType: "RESEND_SENT",
          message: `Auto-resend sent to ${recipient.hrEmail} (${recipient.companyName})`,
        },
      })

      sent++
    } catch (err) {
      console.error(`[ResendExec] Failed resend ${schedule.id}:`, err instanceof Error ? err.message : err)

      await prisma.resendSchedule.update({
        where: { id: schedule.id },
        data: { status: "CANCELLED" },
      })

      await prisma.activityLog.create({
        data: {
          userId: batch.userId ?? schedule.batchRecipient.batch.userId,
          batchId: br?.batchId ?? null,
          batchRecipientId: br?.id ?? null,
          eventType: "RESEND_FAILED",
          message: `Auto-resend failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        },
      })

      failed++
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`[ResendExec] Done: ${sent} sent, ${failed} failed in ${elapsed}s`)

  await scheduleNextResendExecution()
  return { sent, failed }
}

export async function scheduleNextResendExecution() {
  const jobs = await resendExecutionQueue.getRepeatableJobs()
  const existing = jobs.find((j) => j.name === "resend-execution")

  if (!existing) {
    await resendExecutionQueue.upsertJobScheduler(
      "resend-execution",
      { every: EXECUTION_INTERVAL_MS },
      { name: "resend-execution", data: {} }
    )
    console.log(`[ResendExec] Scheduled execution every ${EXECUTION_INTERVAL_MS / 60000}min`)
  }
}
