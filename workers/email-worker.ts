import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/encryption"
import { getSignedFileUrl } from "@/lib/storage"
import { google } from "googleapis"

interface SendJobData {
  batchRecipientId: string
  batchId: string
  recipientId: string
  emailAccountId: string
  templateId: string
  documentIds: string[]
  userId: string
}

export async function processEmailSend(jobData: SendJobData) {
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

  if (batch.status === "SCHEDULED") {
    await prisma.batch.update({
      where: { id: batchId },
      data: { status: "RUNNING" },
    })
  }

  const currentRecipient = await prisma.batchRecipient.findUnique({
    where: { id: batchRecipientId },
  })
  if (!currentRecipient || currentRecipient.status !== "PENDING") {
    return
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

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  })

  await prisma.batchRecipient.update({
    where: { id: batchRecipientId },
    data: { status: "SENT", sentAt: new Date() },
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
}
