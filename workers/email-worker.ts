import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/encryption"
import { getSignedFileUrl } from "@/lib/storage"
import { categorizeError } from "@/lib/email-errors"
import { google } from "googleapis"
import { emailQueue } from "@/lib/queue"

export function isWithinActiveHoursAndDays(
  date: Date,
  hoursStart: string | null,
  hoursEnd: string | null,
  activeDays: string | null
): { isWithin: boolean; nextActiveDate: Date } {
  if (!hoursStart && !hoursEnd && !activeDays) {
    return { isWithin: true, nextActiveDate: date }
  }

  let activeDayNums: number[] = [0, 1, 2, 3, 4, 5, 6]
  if (activeDays) {
    const dayMap: Record<string, number> = {
      sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
    }
    const parts = activeDays.split(",").map(p => p.trim().toLowerCase())
    const parsedDays: number[] = []
    for (const part of parts) {
      if (dayMap[part] !== undefined) {
        parsedDays.push(dayMap[part])
      } else {
        const num = parseInt(part, 10)
        if (!isNaN(num) && num >= 0 && num <= 6) {
          parsedDays.push(num)
        }
      }
    }
    if (parsedDays.length > 0) {
      activeDayNums = parsedDays
    }
  }

  let startMinutes = 0
  let endMinutes = 24 * 60 - 1
  if (hoursStart) {
    const [h, m] = hoursStart.split(":").map(Number)
    if (!isNaN(h) && !isNaN(m)) {
      startMinutes = h * 60 + m
    }
  }
  if (hoursEnd) {
    const [h, m] = hoursEnd.split(":").map(Number)
    if (!isNaN(h) && !isNaN(m)) {
      endMinutes = h * 60 + m
    }
  }

  let current = new Date(date.getTime())

  for (let d = 0; d < 8; d++) {
    const dayOfWeek = current.getDay()
    if (activeDayNums.includes(dayOfWeek)) {
      const currentMinutes = current.getHours() * 60 + current.getMinutes()

      if (d === 0) {
        if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
          return { isWithin: true, nextActiveDate: date }
        } else if (currentMinutes < startMinutes) {
          const nextActive = new Date(current.getTime())
          const [h, m] = (hoursStart || "08:00").split(":").map(Number)
          nextActive.setHours(h, m, 0, 0)
          return { isWithin: false, nextActiveDate: nextActive }
        }
      } else {
        const nextActive = new Date(current.getTime())
        const [h, m] = (hoursStart || "08:00").split(":").map(Number)
        nextActive.setHours(h, m, 0, 0)
        return { isWithin: false, nextActiveDate: nextActive }
      }
    }

    current.setDate(current.getDate() + 1)
    current.setHours(0, 0, 0, 0)
  }

  return { isWithin: true, nextActiveDate: date }
}

interface SendJobData {
  batchRecipientId: string
  batchId: string
  recipientId: string
  emailAccountId: string
  templateId: string
  documentIds: string[]
  userId: string
}

export async function processEmailSend(jobData: SendJobData, attemptsMade: number = 0) {
  const { batchRecipientId, batchId, recipientId, emailAccountId, templateId, documentIds, userId } = jobData

  const batch = await prisma.batch.findUnique({ where: { id: batchId } })
  if (!batch) throw new Error(`Batch ${batchId} not found`)

  if (batch.status === "STOPPED" || batch.status === "FAILED") {
    await prisma.batchRecipient.update({
      where: { id: batchRecipientId },
      data: { status: "SKIPPED" },
    })
    return
  }

  if (batch.status === "PAUSED") {
    return
  }

  const { isWithin, nextActiveDate } = isWithinActiveHoursAndDays(
    new Date(),
    batch.activeHoursStart,
    batch.activeHoursEnd,
    batch.activeDays
  )

  if (!isWithin) {
    const delayMs = nextActiveDate.getTime() - Date.now()
    console.log(`[Worker] Delaying send for BatchRecipient ${batchRecipientId} until ${nextActiveDate.toLocaleString()} due to active hours/days restrictions (delay: ${Math.round(delayMs / 1000)}s)`)

    await emailQueue.add(
      `send-${batchRecipientId}`,
      jobData,
      {
        delay: delayMs > 0 ? delayMs : 0,
        attempts: batch.retryMax + 1,
      }
    )
    return
  }

  if (batch.status === "SCHEDULED") {
    await prisma.batch.update({
      where: { id: batchId },
      data: { status: "RUNNING" },
    })
  }

  const currentRecipient = await prisma.batchRecipient.findUnique({
    where: { id: batchRecipientId },
  })
  if (!currentRecipient || !["PENDING", "FAILED", "RETRY"].includes(currentRecipient.status)) {
    return
  }

  if (attemptsMade > 0) {
    await prisma.batchRecipient.update({
      where: { id: batchRecipientId },
      data: { status: "RETRY", retryCount: attemptsMade },
    })
  }

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

  oauth2Client.on("tokens", async (newTokens) => {
    if (newTokens.refresh_token) {
      const { encrypt } = await import("@/lib/encryption")
      await prisma.emailAccount.update({
        where: { id: emailAccountId },
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
  for (const docId of documentIds) {
    const doc = await prisma.document.findUnique({ where: { id: docId } })
    if (doc) {
      const url = await getSignedFileUrl(doc.fileUrl)
      attachments.push({ url, filename: doc.name })
    }
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

  let gmailThreadIdStr: string | null = null
  let gmailMessageIdStr: string | null = null
  try {
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    })
    gmailThreadIdStr = res.data.threadId ?? null
    gmailMessageIdStr = res.data.id ?? null
  } catch (sendErr) {
    const rawMessage = sendErr instanceof Error ? sendErr.message : String(sendErr)
    const categorized = categorizeError(rawMessage)

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

    const isRetryExhausted = attemptsMade >= batch.retryMax
    const shouldRetry = (categorized.category === "temporary" || categorized.category === "unknown") && !isRetryExhausted

    if (shouldRetry) {
      throw sendErr
    } else {
      console.log(`[Worker] Preventing further retries for BatchRecipient ${batchRecipientId} due to error category: ${categorized.category} or retry limits exhausted.`)
      await evaluateBatchStatus(batchId, userId)
      return
    }
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

  await prisma.activityLog.create({
    data: {
      userId,
      batchId,
      batchRecipientId,
      eventType: "EMAIL_SENT",
      message: `Email sent to ${recipient.hrEmail}`,
    },
  })

  await evaluateBatchStatus(batchId, userId)
}

async function evaluateBatchStatus(batchId: string, userId: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { batchRecipients: true }
  })
  if (!batch) return

  const recipients = batch.batchRecipients
  const total = recipients.length
  const sent = recipients.filter(r => r.status === "SENT").length
  const failed = recipients.filter(r => r.status === "FAILED").length
  const processed = sent + failed

  // Check Auto-Stop threshold (only evaluate if at least 1 failure and processed count >= 3 or all processed)
  if (processed > 0 && (processed >= 3 || processed === total)) {
    const failureRate = failed / processed
    if (failureRate >= batch.autoStopThreshold) {
      console.log(`[Worker] Auto-Stop triggered for Batch ${batchId}. Failure rate is ${(failureRate * 100).toFixed(1)}% (threshold: ${(batch.autoStopThreshold * 100).toFixed(1)}%).`)

      // Update remaining PENDING/RETRY recipients to SKIPPED
      await prisma.batchRecipient.updateMany({
        where: {
          batchId,
          status: { in: ["PENDING", "RETRY"] }
        },
        data: { status: "SKIPPED" }
      })

      // Set batch status to FAILED as per standard auto-stop behavior
      await prisma.batch.update({
        where: { id: batchId },
        data: { status: "FAILED" }
      })

      await prisma.activityLog.create({
        data: {
          userId,
          batchId,
          eventType: "BATCH_FAILED",
          message: `Auto-Stop aktif: Tingkat kegagalan ${(failureRate * 100).toFixed(0)}% melebihi batas ${(batch.autoStopThreshold * 100).toFixed(0)}%. Pengiriman dihentikan.`
        }
      })
      return
    }
  }

  // Check Batch Completion
  const pendingOrRetry = recipients.filter(r => ["PENDING", "RETRY"].includes(r.status)).length
  if (pendingOrRetry === 0) {
    console.log(`[Worker] Batch ${batchId} has completed processing all recipients.`)
    await prisma.batch.update({
      where: { id: batchId },
      data: { status: "COMPLETED" }
    })

    await prisma.activityLog.create({
      data: {
        userId,
        batchId,
        eventType: "BATCH_COMPLETED",
        message: `Batch lamaran selesai dikirim. Berhasil: ${sent}, Gagal: ${failed}.`
      }
    })
  }
}
