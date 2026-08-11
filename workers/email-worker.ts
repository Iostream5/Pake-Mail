import { prisma } from "@/lib/prisma"
import { decrypt, encrypt } from "@/lib/encryption"
import { categorizeError, type ErrorCategoryName } from "@/lib/email-errors"
import { google } from "googleapis"
import { redis } from "@/lib/redis"
import { isWithinWindow, nextWindowStart } from "@/lib/active-window"
import { updateBatchProgress } from "@/lib/batch-progress"
import {
  AttachmentError,
  assertMessageWithinLimit,
  buildMimeMessage,
  loadAttachmentsWithMeta,
  type AttachmentFile,
} from "@/lib/attachments"
import { findLetterTemplate, renderApplicationLetter } from "@/lib/letter"

export interface SendJobData {
  batchRecipientId: string
  batchId: string
  recipientId: string
  emailAccountId: string
  templateId: string
  documentIds: string[]
  userId: string
}

export interface EmailJobContext {
  attemptsMade: number
  totalAttempts: number
}

export type SendOutcome =
  | { type: "completed" }
  | { type: "retry"; error: Error }
  | { type: "failed"; error: Error }
  | { type: "delayed"; delayUntil: Date }

const QUOTA_BACKOFF_MS = 30 * 60 * 1000

async function checkPerAccountGate(
  emailAccountId: string,
  delaySeconds: number
): Promise<{ allowed: boolean; delayUntil?: Date }> {
  const now = Date.now()
  const intervalMs = delaySeconds * 1000

  const lastSentRaw = await redis.get(`last-sent:${emailAccountId}`)
  const lastSentMs = lastSentRaw ? Number(lastSentRaw) : 0
  if (Number.isFinite(lastSentMs) && lastSentMs > 0 && now - lastSentMs < intervalMs) {
    return { allowed: false, delayUntil: new Date(lastSentMs + intervalMs) }
  }

  const lockKey = `send-lock:${emailAccountId}`
  const acquired = await redis.set(lockKey, `${process.pid}:${now}:${Math.random()}`, "PX", intervalMs, "NX")
  if (acquired !== "OK") {
    const remainingMs = await redis.pttl(lockKey)
    return {
      allowed: false,
      delayUntil: new Date(now + (remainingMs > 0 ? remainingMs : intervalMs)),
    }
  }
  return { allowed: true }
}

interface FailureInfo {
  category: ErrorCategoryName
  friendlyMessage: string
}

function describeFailure(err: unknown): FailureInfo {
  if (err instanceof AttachmentError) {
    return { category: "attachment", friendlyMessage: err.message }
  }
  const categorized = err as { category?: ErrorCategoryName } | null
  if (
    categorized?.category === "temporary" ||
    categorized?.category === "permanent"
  ) {
    const message = err instanceof Error ? err.message : String(err)
    return { category: categorized.category, friendlyMessage: message }
  }
  const raw = err instanceof Error ? err.message : String(err)
  const classified = categorizeError(raw)
  return { category: classified.category, friendlyMessage: classified.friendlyMessage }
}

async function markFailed(
  batchRecipientId: string,
  userId: string,
  batchId: string,
  raw: string,
  failure: FailureInfo
): Promise<void> {
  await prisma.batchRecipient.update({
    where: { id: batchRecipientId },
    data: {
      status: "FAILED",
      errorLog: JSON.stringify({ raw, friendly: failure.friendlyMessage, category: failure.category }),
    },
  })
  await prisma.activityLog.create({
    data: {
      userId,
      batchId,
      batchRecipientId,
      eventType: "EMAIL_FAILED",
      message: failure.friendlyMessage,
    },
  })
}

async function markRetry(
  batchRecipientId: string,
  raw: string,
  failure: FailureInfo
): Promise<void> {
  await prisma.batchRecipient.update({
    where: { id: batchRecipientId },
    data: {
      status: "RETRY",
      retryCount: { increment: 1 },
      errorLog: JSON.stringify({ raw, friendly: failure.friendlyMessage, category: failure.category }),
    },
  })
}

export async function processEmailSend(
  jobData: SendJobData,
  context: EmailJobContext
): Promise<SendOutcome> {
  const { batchRecipientId, batchId, recipientId, emailAccountId, templateId, documentIds, userId } = jobData
  const { attemptsMade, totalAttempts } = context

  const batch = await prisma.batch.findUnique({ where: { id: batchId } })
  if (!batch) return { type: "failed", error: new Error(`Batch ${batchId} not found`) }

  if (batch.status === "STOPPED" || batch.status === "FAILED") {
    await prisma.batchRecipient.update({
      where: { id: batchRecipientId },
      data: { status: "SKIPPED" },
    })
    return { type: "completed" }
  }

  if (batch.status === "PAUSED") {
    return { type: "completed" }
  }

  if (batch.status === "SCHEDULED") {
    await prisma.batch.update({
      where: { id: batchId },
      data: { status: "RUNNING" },
    })
  }

  const now = new Date()
  if (!isWithinWindow(now, batch)) {
    return { type: "delayed", delayUntil: nextWindowStart(now, batch) }
  }

  const currentRecipient = await prisma.batchRecipient.findUnique({
    where: { id: batchRecipientId },
  })
  if (!currentRecipient || !["PENDING", "RETRY"].includes(currentRecipient.status)) {
    return { type: "completed" }
  }

  const gate = await checkPerAccountGate(emailAccountId, batch.delaySeconds)
  if (!gate.allowed) {
    return { type: "delayed", delayUntil: gate.delayUntil! }
  }

  try {
    const [account, template, recipient, profile] = await Promise.all([
      prisma.emailAccount.findUnique({ where: { id: emailAccountId } }),
      prisma.emailTemplate.findUnique({ where: { id: templateId } }),
      prisma.recipient.findUnique({ where: { id: recipientId } }),
      prisma.profile.findUnique({
        where: { userId },
        include: { educations: true, experiences: true },
      }),
    ])

    if (!account || !template || !recipient || !profile) {
      throw new Error("Missing required data for email send")
    }

    const tokens = JSON.parse(decrypt(account.oauthToken))
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    oauth2Client.setCredentials(tokens)

    let refreshedTokens: Record<string, unknown> | null = null
    oauth2Client.on("tokens", (newTokens) => {
      refreshedTokens = { ...tokens, ...newTokens }
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

    const { files: loadedFiles, documents } = await loadAttachmentsWithMeta(documentIds)

    const letterTemplate = findLetterTemplate(documents)
    let attachments: AttachmentFile[] = loadedFiles
    if (letterTemplate) {
      const templateFile = loadedFiles.find((f) => f.documentId === letterTemplate.id)
      const letter = await renderApplicationLetter({
        templateDoc: letterTemplate,
        company: recipient.companyName,
        position: recipient.position ?? "",
        sendDate: batch.scheduledAt ?? new Date(),
        docxBuffer: templateFile?.buffer,
      })
      attachments = [
        { name: letter.filename, buffer: letter.pdf, contentType: "application/pdf" },
        ...loadedFiles.filter((f) => f.documentId !== letterTemplate.id),
      ]
    }

    const raw = Buffer.from(
      buildMimeMessage({
        from: account.email,
        to: recipient.hrEmail,
        subject,
        body,
        attachments,
      }),
      "utf8"
    ).toString("base64url")
    assertMessageWithinLimit(raw)

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    })
    const gmailThreadIdStr = res.data.threadId ?? null
    const gmailMessageIdStr = res.data.id ?? null

    if (refreshedTokens) {
      await prisma.emailAccount.update({
        where: { id: emailAccountId },
        data: { oauthToken: encrypt(JSON.stringify(refreshedTokens)) },
      })
    }

    await prisma.batchRecipient.update({
      where: { id: batchRecipientId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        gmailThreadId: gmailThreadIdStr,
        gmailMessageId: gmailMessageIdStr,
      },
    })

    await redis.set(`last-sent:${emailAccountId}`, String(Date.now()))

    await prisma.activityLog.create({
      data: {
        userId,
        batchId,
        batchRecipientId,
        eventType: "EMAIL_SENT",
        message: `Email sent to ${recipient.hrEmail}`,
      },
    })

    await updateBatchProgress(batchId)
    return { type: "completed" }
  } catch (err) {
    return handleSendFailure(err, { batchRecipientId, batchId, userId, attemptsMade, totalAttempts })
  }
}

async function handleSendFailure(
  err: unknown,
  opts: { batchRecipientId: string; batchId: string; userId: string; attemptsMade: number; totalAttempts: number }
): Promise<SendOutcome> {
  const { batchRecipientId, batchId, userId, attemptsMade, totalAttempts } = opts
  const raw = err instanceof Error ? err.message : String(err)
  const failure = describeFailure(err)

  if (failure.category === "permanent" || failure.category === "attachment" || failure.category === "auth") {
    console.error(`[EmailWorker] Non-retryable failure (${failure.category}): ${raw}`)
    await markFailed(batchRecipientId, userId, batchId, raw, failure)
    await updateBatchProgress(batchId)
    return { type: "completed" }
  }

  if (failure.category === "quota") {
    console.warn(`[EmailWorker] Quota/rate-limit hit, backing off ${QUOTA_BACKOFF_MS / 60000}min: ${raw}`)
    return { type: "delayed", delayUntil: new Date(Date.now() + QUOTA_BACKOFF_MS) }
  }

  if (attemptsMade + 1 < totalAttempts) {
    console.warn(`[EmailWorker] Retryable failure (${failure.category}), attempt ${attemptsMade + 1}/${totalAttempts}: ${raw}`)
    await markRetry(batchRecipientId, raw, failure)
    return { type: "retry", error: err instanceof Error ? err : new Error(raw) }
  }

  console.error(`[EmailWorker] Final attempt failed (${failure.category}): ${raw}`)
  await markFailed(batchRecipientId, userId, batchId, raw, failure)
  await updateBatchProgress(batchId)
  return { type: "failed", error: err instanceof Error ? err : new Error(raw) }
}
