/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/encryption"
import { categorizeError } from "@/lib/email-errors"
import { google } from "googleapis"
import { redis } from "@/lib/redis"
import { isWithinWindow, nextWindowStart } from "@/lib/active-window"
import { fetchAttachments, assembleMimeMessage } from "@/lib/attachments"
import { updateBatchProgress } from "@/lib/batch-progress"
import { DelayedError } from "bullmq"

interface SendJobData {
  batchRecipientId: string
  batchId: string
  recipientId: string
  emailAccountId: string
  templateId: string
  documentIds: string[]
  userId: string
}

export async function processEmailSend(job: any, token?: any) {
  const jobData = job.data as SendJobData
  const { batchRecipientId, batchId, recipientId, emailAccountId, templateId, documentIds, userId } = jobData

  const batch = await prisma.batch.findUnique({ where: { id: batchId } })
  if (!batch) throw new Error(`Batch ${batchId} not found`)

  if (batch.status === "STOPPED" || batch.status === "FAILED") {
    await prisma.batchRecipient.update({
      where: { id: batchRecipientId },
      data: { status: "SKIPPED" },
    })
    await updateBatchProgress(batchId)
    return
  }

  if (batch.status === "PAUSED") {
    return
  }

  const currentRecipient = await prisma.batchRecipient.findUnique({
    where: { id: batchRecipientId },
  })
  if (!currentRecipient || !["PENDING", "RETRY"].includes(currentRecipient.status)) {
    return
  }

  // B4 Active Window check
  const now = new Date()
  if (!isWithinWindow(now, batch)) {
    const resumeTime = nextWindowStart(now, batch)
    await job.moveToDelayed(resumeTime, token)
    throw new DelayedError()
  }

  // Transition batch status from SCHEDULED to RUNNING
  if (batch.status === "SCHEDULED") {
    await prisma.batch.update({
      where: { id: batchId },
      data: { status: "RUNNING" },
    })
  }

  // B5/B6 Concurrency & Delay Locking
  const nowMs = Date.now()
  const delayMs = batch.delaySeconds * 1000

  const lastSentStr = await redis.get(`last-sent:${emailAccountId}`)
  const lastSent = lastSentStr ? Number(lastSentStr) : 0
  const elapsed = nowMs - lastSent

  if (elapsed < delayMs) {
    const remainingWait = delayMs - elapsed
    await job.moveToDelayed(nowMs + remainingWait, token)
    throw new DelayedError()
  }

  const lockKey = `send-lock:${emailAccountId}`
  const lockAcquired = await redis.set(lockKey, "1", "PX", delayMs, "NX")
  if (!lockAcquired) {
    const lockTTL = await redis.pttl(lockKey)
    const remainingWait = lockTTL > 0 ? lockTTL : delayMs
    await job.moveToDelayed(nowMs + remainingWait, token)
    throw new DelayedError()
  }

  // Load remaining data
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

  // B13 OAuth Token Persistence Setup
  const tokens = JSON.parse(decrypt(account.oauthToken))
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  oauth2Client.setCredentials(tokens)

  let tokenChanged = false
  const currentTokens = { ...tokens }

  oauth2Client.on("tokens", (newTokens) => {
    let changed = false
    const nt = newTokens as Record<string, any>
    const ct = currentTokens as Record<string, any>
    for (const key of Object.keys(nt)) {
      if (nt[key] !== ct[key]) {
        changed = true
        ct[key] = nt[key]
      }
    }
    if (changed) {
      tokenChanged = true
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

  let gmailThreadIdStr: string | null = null
  let gmailMessageIdStr: string | null = null

  try {
    // B11 Fetch and compile attachments
    const attachments = await fetchAttachments(documentIds)

    // Assemble MIME message with CRLF (\r\n) line endings
    const { raw, totalSize } = assembleMimeMessage({
      from: account.email,
      to: recipient.hrEmail,
      subject,
      body,
      attachments,
    })

    // Validate 25MB limit before send
    const limitBytes = 25 * 1024 * 1024
    if (totalSize > limitBytes) {
      throw new Error(`AttachmentError: Total ukuran email termasuk lampiran (${(totalSize / 1024 / 1024).toFixed(2)}MB) melebihi batas Gmail 25MB.`)
    }

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    })
    gmailThreadIdStr = res.data.threadId ?? null
    gmailMessageIdStr = res.data.id ?? null

    // Successful Send Cooldown
    await redis.set(`last-sent:${emailAccountId}`, String(Date.now()))
  } catch (sendErr) {
    if (sendErr instanceof DelayedError) {
      throw sendErr
    }

    const rawMessage = sendErr instanceof Error ? sendErr.message : String(sendErr)
    const categorized = categorizeError(rawMessage)

    // Check classification routing
    if (categorized.category === "permanent" || categorized.category === "attachment") {
      await prisma.batchRecipient.update({
        where: { id: batchRecipientId },
        data: {
          status: "FAILED",
          errorLog: JSON.stringify({ raw: rawMessage, friendly: categorized.friendlyMessage, category: categorized.category }),
        },
      })
      await prisma.activityLog.create({
        data: {
          userId,
          batchId,
          batchRecipientId,
          eventType: "EMAIL_FAILED",
          message: categorized.friendlyMessage,
        },
      })
      await updateBatchProgress(batchId)
      return
    }

    if (categorized.category === "auth") {
      await prisma.batchRecipient.update({
        where: { id: batchRecipientId },
        data: {
          status: "FAILED",
          errorLog: JSON.stringify({ raw: rawMessage, friendly: categorized.friendlyMessage, category: categorized.category }),
        },
      })
      await prisma.activityLog.create({
        data: {
          userId,
          batchId,
          batchRecipientId,
          eventType: "EMAIL_FAILED",
          message: categorized.friendlyMessage,
        },
      })
      console.error(`[Worker] Auth failure on account ${emailAccountId}: ${rawMessage}`)
      await updateBatchProgress(batchId)
      return
    }

    if (categorized.category === "quota") {
      const backoffMs = 3600 * 1000 // 1 hour backoff
      await job.moveToDelayed(Date.now() + backoffMs, token)
      throw new DelayedError()
    }

    // B2 Retry loop logic for temporary/unknown errors
    const attemptsMade = job.attemptsMade ?? 0
    const totalAttempts = job.opts?.attempts ?? 1

    if (attemptsMade + 1 < totalAttempts) {
      await prisma.batchRecipient.update({
        where: { id: batchRecipientId },
        data: {
          status: "RETRY",
          retryCount: { increment: 1 },
          errorLog: JSON.stringify({ raw: rawMessage, friendly: categorized.friendlyMessage, category: categorized.category }),
        },
      })
      await prisma.activityLog.create({
        data: {
          userId,
          batchId,
          batchRecipientId,
          eventType: "EMAIL_FAILED_RETRY",
          message: `${categorized.friendlyMessage} (Mencoba kembali...)`,
        },
      })
      await updateBatchProgress(batchId)
      throw sendErr
    } else {
      await prisma.batchRecipient.update({
        where: { id: batchRecipientId },
        data: {
          status: "FAILED",
          errorLog: JSON.stringify({ raw: rawMessage, friendly: categorized.friendlyMessage, category: categorized.category }),
        },
      })
      await prisma.activityLog.create({
        data: {
          userId,
          batchId,
          batchRecipientId,
          eventType: "EMAIL_FAILED",
          message: categorized.friendlyMessage,
        },
      })
      await updateBatchProgress(batchId)
      throw sendErr
    }
  }

  // B13 Persist refreshed credentials if they changed
  if (tokenChanged) {
    const { encrypt } = await import("@/lib/encryption")
    await prisma.emailAccount.update({
      where: { id: emailAccountId },
      data: { oauthToken: encrypt(JSON.stringify(currentTokens)) },
    })
  }

  // Update Recipient and batch on successful send
  await prisma.batchRecipient.update({
    where: { id: batchRecipientId },
    data: {
      status: "SENT",
      sentAt: new Date(),
      gmailThreadId: gmailThreadIdStr,
      gmailMessageId: gmailMessageIdStr,
    },
  })

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
}
