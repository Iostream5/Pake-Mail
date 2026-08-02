import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/encryption"
import { google, gmail_v1 } from "googleapis"

type OAuthTokens = {
  access_token?: string
  refresh_token?: string
  scope?: string
  token_type?: string
  expiry_date?: number
}

function getGmailClient(oauthToken: string, emailAccountId: string) {
  const tokens: OAuthTokens = JSON.parse(decrypt(oauthToken))
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
  return google.gmail({ version: "v1", auth: oauth2Client })
}

const AUTO_REPLY_PATTERNS = [
  /no-?reply@/i, /noreply@/i, /donotreply@/i, /do-not-reply@/i,
  /mailer-daemon@/i, /^auto(-?)reply/i, /^out of office/i,
  /^automatic reply/i, /tidak\s+masuk\s+kantor/i, /otomatis/i,
  /vacation/i, /absence/i, /acknowledgement of receipt/i,
  /we (have )?received your (application|resume|email)/i,
  /thank you for (your )?(interest|application|applying)/i,
  /this is an automated/i, /we will review/i, /we appreciate your interest/i,
]

const AUTO_REPLY_SENDERS = [
  /no-?reply@/i, /noreply@/i, /donotreply@/i, /do-not-reply@/i,
  /mailer-daemon@/i, /careers@/i, /jobs@/i, /recruitment@/i,
  /hr@/i, /talent\.*@/i,
]

function isLikelyAutomated(from: string, subject: string, snippet: string): boolean {
  const text = `${from} ${subject} ${snippet}`
  if (AUTO_REPLY_SENDERS.some((p) => p.test(from))) return true
  if (AUTO_REPLY_PATTERNS.some((p) => p.test(text))) return true
  return false
}

function extractEmailAddress(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([^\s]+@[^\s]+)/)
  return match ? match[1]!.trim() : fromHeader.trim()
}

function extractDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? ""
}

async function fetchThreadMessages(gmail: gmail_v1.Gmail, threadId: string): Promise<gmail_v1.Schema$Message[]> {
  const res = await gmail.users.threads.get({
    userId: "me", id: threadId, format: "metadata",
    metadataHeaders: ["From", "Subject", "Date", "Message-ID", "In-Reply-To", "References"],
  })
  return res.data.messages ?? []
}

async function searchMessages(gmail: gmail_v1.Gmail, query: string, maxResults = 15): Promise<gmail_v1.Schema$Message[]> {
  const res = await gmail.users.messages.list({
    userId: "me", q: query, maxResults,
  })
  const ids = res.data.messages ?? []
  if (ids.length === 0) return []

  const messages: gmail_v1.Schema$Message[] = []
  const limit = Math.min(ids.length, maxResults)
  for (let i = 0; i < limit; i++) {
    const msg = await gmail.users.messages.get({
      userId: "me", id: ids[i]!.id!,
      format: "metadata",
      metadataHeaders: ["From", "Subject", "Date", "Message-ID"],
    })
    if (msg.data) messages.push(msg.data)
  }
  return messages
}

async function getExcludePatterns(userId: string): Promise<string[]> {
  const entries = await prisma.excludeListEntry.findMany({
    where: { userId },
    select: { pattern: true },
  })
  return entries.map((e) => e.pattern.toLowerCase())
}

// ─── TIER: CONFIRMED (thread matching) ─────────────────

async function detectConfirmed(
  gmail: gmail_v1.Gmail, userId: string, batchRecipients: any[]
): Promise<number> {
  let count = 0
  for (const br of batchRecipients) {
    if (!br.gmailThreadId) continue
    try {
      const messages = await fetchThreadMessages(gmail, br.gmailThreadId)
      let foundSent = false
      for (const msg of messages) {
        const headers = msg.payload?.headers ?? []
        const getH = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ""
        const from = getH("From"), subject = getH("Subject"), dateStr = getH("Date")
        const msgId = msg.id!
        const inReplyTo = getH("in-reply-to")
        const references = getH("references")

        if (msg.id === br.gmailMessageId) { foundSent = true; continue }
        if (!foundSent) continue

        const fromEmail = extractEmailAddress(from)
        if (fromEmail.toLowerCase() !== br.recipient.hrEmail.toLowerCase()) continue

        const hasThreadHeader = inReplyTo.length > 0 || references.length > 0
        const receivedAt = dateStr ? new Date(dateStr) : new Date()

        const automated = isLikelyAutomated(from, subject, msg.snippet ?? "")

        await createReply({
          batchRecipientId: br.id, gmailThreadId: br.gmailThreadId,
          senderEmail: fromEmail, snippet: msg.snippet?.substring(0, 500) ?? "",
          receivedAt, confidenceTier: "CONFIRMED", matchedVia: "thread",
          isLikelyAutomated: automated,
          userId, batchId: br.batchId, companyName: br.recipient.companyName,
          subject: subject.substring(0, 100), shouldUpdateStatus: hasThreadHeader,
        })
        count++
      }
    } catch (err) {
      console.error(`[GmailPoll] Confirmed error ${br.id}:`, err instanceof Error ? err.message : err)
    }
  }
  return count
}

// ─── TIER: LIKELY (sender exact match) ─────────────────

async function detectLikely(
  gmail: gmail_v1.Gmail, userId: string, batchRecipients: any[], accountEmail: string
): Promise<number> {
  const hrEmails = [...new Set(batchRecipients.map((br: any) => br.recipient.hrEmail.toLowerCase()))]
  let count = 0

  for (const hrEmail of hrEmails) {
    try {
      const existingSenders = await prisma.reply.findMany({
        where: { batchRecipient: { batch: { userId } }, senderEmail: hrEmail },
        select: { senderEmail: true },
      })
      const processed = new Set(existingSenders.map((r) => r.senderEmail.toLowerCase()))

      if (processed.has(hrEmail)) continue

      const messages = await searchMessages(gmail, `from:${hrEmail} newer_than:90d`, 10)
      for (const msg of messages) {
        const headers = msg.payload?.headers ?? []
        const getH = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ""
        const from = getH("From"), subject = getH("Subject"), dateStr = getH("Date")
        const fromEmail = extractEmailAddress(from).toLowerCase()

        if (fromEmail !== hrEmail) continue
        if (fromEmail === accountEmail.toLowerCase()) continue

        const existing = await prisma.reply.findFirst({
          where: { senderEmail: fromEmail, snippet: { startsWith: (msg.snippet ?? "").substring(0, 50) } },
        })
        if (existing) continue

        const br = batchRecipients.find((b: any) =>
          b.recipient.hrEmail.toLowerCase() === hrEmail && b.recipient.hrEmail.toLowerCase() !== accountEmail.toLowerCase()
        )
        if (!br) continue

        const automated = isLikelyAutomated(from, subject, msg.snippet ?? "")
        const receivedAt = dateStr ? new Date(dateStr) : new Date()

        await createReply({
          batchRecipientId: br.id, gmailThreadId: msg.threadId ?? null,
          senderEmail: fromEmail, snippet: msg.snippet?.substring(0, 500) ?? "",
          receivedAt, confidenceTier: "LIKELY", matchedVia: "sender_exact",
          isLikelyAutomated: automated,
          userId, batchId: br.batchId, companyName: br.recipient.companyName,
          subject: subject.substring(0, 100), shouldUpdateStatus: true,
        })
        count++
      }
    } catch (err) {
      console.error(`[GmailPoll] Likely error ${hrEmail}:`, err instanceof Error ? err.message : err)
    }
  }
  return count
}

// ─── TIER: POSSIBLE (domain match) ─────────────────────

async function detectPossible(
  gmail: gmail_v1.Gmail, userId: string, batchRecipients: any[], accountEmail: string
): Promise<number> {
  const domains = [...new Set(batchRecipients.map((br: any) => extractDomain(br.recipient.hrEmail)))]
  let count = 0

  const processedSenders = await prisma.reply.findMany({
    where: { batchRecipient: { batch: { userId } } },
    select: { senderEmail: true },
  })
  const processed = new Set(processedSenders.map((r) => r.senderEmail.toLowerCase()))

  for (const domain of domains) {
    if (!domain) continue
    try {
      const messages = await searchMessages(gmail, `from:${domain} newer_than:90d`, 15)
      for (const msg of messages) {
        const headers = msg.payload?.headers ?? []
        const getH = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ""
        const from = getH("From"), subject = getH("Subject"), dateStr = getH("Date")
        const fromEmail = extractEmailAddress(from).toLowerCase()

        if (processed.has(fromEmail)) continue
        if (fromEmail === accountEmail.toLowerCase()) continue

        const msgDomain = extractDomain(fromEmail)
        if (msgDomain !== domain) continue

        const br = batchRecipients.find((b: any) =>
          extractDomain(b.recipient.hrEmail) === domain &&
          b.recipient.hrEmail.toLowerCase() !== fromEmail
        )
        if (!br) continue

        const automated = isLikelyAutomated(from, subject, msg.snippet ?? "")
        const receivedAt = dateStr ? new Date(dateStr) : new Date()

        await createReply({
          batchRecipientId: br.id, gmailThreadId: msg.threadId ?? null,
          senderEmail: fromEmail, snippet: msg.snippet?.substring(0, 500) ?? "",
          receivedAt, confidenceTier: "POSSIBLE", matchedVia: "domain",
          isLikelyAutomated: automated,
          userId, batchId: br.batchId, companyName: br.recipient.companyName,
          subject: subject.substring(0, 100), shouldUpdateStatus: false,
        })
        count++
      }
    } catch (err) {
      console.error(`[GmailPoll] Possible error ${domain}:`, err instanceof Error ? err.message : err)
    }
  }
  return count
}

// ─── TIER: INDIKASI (company name match) ───────────────

async function detectIndikasi(
  gmail: gmail_v1.Gmail, userId: string, batchRecipients: any[], accountEmail: string
): Promise<number> {
  const companyNames = [...new Set(batchRecipients.map((br: any) => br.recipient.companyName))]
  let count = 0
  const excludePatterns = await getExcludePatterns(userId)

  for (const companyName of companyNames) {
    if (!companyName || companyName.length < 3) continue
    try {
      const shortName = companyName.replace(/\b(PT|CV|UD|LLC|Inc|Corp|Ltd)\b/gi, "").trim()
      if (shortName.length < 3) continue

      const messages = await searchMessages(gmail, `"${shortName}" newer_than:90d`, 10)
      for (const msg of messages) {
        const headers = msg.payload?.headers ?? []
        const getH = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ""
        const from = getH("From"), subject = getH("Subject"), dateStr = getH("Date")
        const fromEmail = extractEmailAddress(from).toLowerCase()

        if (fromEmail === accountEmail.toLowerCase()) continue

        if (excludePatterns.some((p) => fromEmail.includes(p) || subject.toLowerCase().includes(p))) continue

        const existing = await prisma.reply.findFirst({
          where: { senderEmail: fromEmail, snippet: { startsWith: (msg.snippet ?? "").substring(0, 50) } },
        })
        if (existing) continue

        const br = batchRecipients.find((b: any) =>
          b.recipient.companyName.toLowerCase() === companyName.toLowerCase()
        )
        if (!br) continue

        const automated = isLikelyAutomated(from, subject, msg.snippet ?? "")
        const receivedAt = dateStr ? new Date(dateStr) : new Date()

        await createReply({
          batchRecipientId: br.id, gmailThreadId: msg.threadId ?? null,
          senderEmail: fromEmail, snippet: msg.snippet?.substring(0, 500) ?? "",
          receivedAt, confidenceTier: "INDIKASI", matchedVia: "company_name",
          isLikelyAutomated: automated,
          userId, batchId: br.batchId, companyName: br.recipient.companyName,
          subject: subject.substring(0, 100), shouldUpdateStatus: false,
        })
        count++
      }
    } catch (err) {
      console.error(`[GmailPoll] Indikasi error ${companyName}:`, err instanceof Error ? err.message : err)
    }
  }
  return count
}

// ─── SHARED REPLY CREATOR ──────────────────────────────

async function createReply(params: {
  batchRecipientId: string, gmailThreadId: string | null,
  senderEmail: string, snippet: string, receivedAt: Date,
  confidenceTier: "CONFIRMED" | "LIKELY" | "POSSIBLE" | "INDIKASI",
  matchedVia: string, isLikelyAutomated: boolean,
  userId: string, batchId: string, companyName: string, subject: string,
  shouldUpdateStatus: boolean,
}) {
  if (params.confidenceTier === "CONFIRMED" || params.confidenceTier === "LIKELY") {
    const existing = await prisma.reply.findFirst({
      where: { gmailThreadId: params.gmailThreadId, batchRecipientId: params.batchRecipientId },
    })
    if (existing) return
  }

  await prisma.reply.create({
    data: {
      batchRecipientId: params.batchRecipientId,
      gmailThreadId: params.gmailThreadId,
      senderEmail: params.senderEmail,
      snippet: params.snippet,
      receivedAt: params.receivedAt,
      confidenceTier: params.confidenceTier,
      matchedVia: params.matchedVia,
      isLikelyAutomated: params.isLikelyAutomated,
    },
  })

  if (params.shouldUpdateStatus) {
    await prisma.batchRecipient.update({
      where: { id: params.batchRecipientId },
      data: { status: "REPLY" },
    })
  }

  await prisma.resendSchedule.updateMany({
    where: { batchRecipientId: params.batchRecipientId, status: "PENDING_APPROVAL" },
    data: { status: "CANCELLED" },
  })
  await prisma.batchRecipient.update({
    where: { id: params.batchRecipientId },
    data: { nextResendScheduledAt: null },
  })

  const eventType = params.confidenceTier === "CONFIRMED" || params.confidenceTier === "LIKELY"
    ? "REPLY_DETECTED" : "POTENTIAL_REPLY_DETECTED"
  const logMsg = params.shouldUpdateStatus
    ? `Reply from ${params.companyName}: ${params.subject}`
    : `${params.confidenceTier} signal from ${params.companyName}: ${params.subject}`

  await prisma.activityLog.create({
    data: {
      userId: params.userId, batchId: params.batchId,
      batchRecipientId: params.batchRecipientId,
      eventType, message: logMsg,
    },
  })

  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.shouldUpdateStatus ? "new_reply" : "potential_reply",
      title: params.isLikelyAutomated
        ? `Auto-reply dari ${params.companyName}`
        : params.shouldUpdateStatus
          ? `${params.companyName} membalas lamaran Anda`
          : `Potensi balasan dari ${params.companyName} — perlu ditinjau`,
      refId: params.batchRecipientId,
    },
  })
}

// ─── MAIN POLL FUNCTION ─────────────────────────────────

export async function pollRepliesForUser(
  userId: string, emailAccountId: string, oauthToken: string, accountEmail: string
): Promise<{ newReplies: number; potentialMatches: number }> {
  const gmail = getGmailClient(oauthToken, emailAccountId)

  const sentRecipients = await prisma.batchRecipient.findMany({
    where: {
      batch: { userId, emailAccountId },
      status: { in: ["SENT", "APPLIED"] },
      sentAt: { not: null },
    },
    include: {
      recipient: { select: { hrEmail: true, companyName: true } },
      batch: { select: { name: true, id: true } },
    },
  })

  if (sentRecipients.length === 0) return { newReplies: 0, potentialMatches: 0 }

  const confirmed = await detectConfirmed(gmail, userId, sentRecipients)
  const likely = await detectLikely(gmail, userId, sentRecipients, accountEmail)
  const possible = await detectPossible(gmail, userId, sentRecipients, accountEmail)
  const indikasi = await detectIndikasi(gmail, userId, sentRecipients, accountEmail)

  return {
    newReplies: confirmed + likely,
    potentialMatches: possible + indikasi,
  }
}

export async function pollAllUsers(): Promise<{ totalNewReplies: number; totalPotential: number; accountsChecked: number }> {
  const accounts = await prisma.emailAccount.findMany({
    where: { provider: "GMAIL" },
    select: { id: true, userId: true, oauthToken: true, email: true },
  })

  let totalNewReplies = 0
  let totalPotential = 0
  let accountsChecked = 0

  for (const account of accounts) {
    try {
      const result = await pollRepliesForUser(account.userId, account.id, account.oauthToken, account.email)
      totalNewReplies += result.newReplies
      totalPotential += result.potentialMatches
      accountsChecked++
      console.log(`[GmailPoll] Account ${account.email}: ${result.newReplies} new replies, ${result.potentialMatches} potential matches`)
    } catch (err) {
      console.error(`[GmailPoll] Error polling account ${account.email}:`, err instanceof Error ? err.message : err)
    }
  }

  return { totalNewReplies, totalPotential, accountsChecked }
}
