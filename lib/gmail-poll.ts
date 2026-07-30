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
  /no-?reply@/i,
  /noreply@/i,
  /donotreply@/i,
  /do-not-reply@/i,
  /mailer-daemon@/i,
  /^auto(-?)reply/i,
  /^out of office/i,
  /^automatic reply/i,
  /tidak\s+masuk\s+kantor/i,
  /otomatis/i,
  /vacation/i,
  /absence/i,
  /acknowledgement of receipt/i,
  /we (have )?received your (application|resume|email)/i,
  /thank you for (your )?(interest|application|applying)/i,
  /this is an automated/i,
  /we will review/i,
  /we appreciate your interest/i,
]

const AUTO_REPLY_SENDERS = [
  /no-?reply@/i,
  /noreply@/i,
  /donotreply@/i,
  /do-not-reply@/i,
  /mailer-daemon@/i,
  /careers@/i,
  /jobs@/i,
  /recruitment@/i,
  /hr@/i,
  /talent\.*@/i,
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

async function fetchThreadMessages(
  gmail: gmail_v1.Gmail,
  threadId: string
): Promise<gmail_v1.Schema$Message[]> {
  const res = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "metadata",
    metadataHeaders: ["From", "Subject", "Date", "Message-ID"],
  })
  return res.data.messages ?? []
}

function findReplies(
  messages: gmail_v1.Schema$Message[],
  sentMessageId: string,
  sentAt: Date,
  hrEmail: string
): Array<{ messageId: string; from: string; subject: string; snippet: string; date: Date }> {
  let foundSent = false
  const replies: Array<{ messageId: string; from: string; subject: string; snippet: string; date: Date }> = []

  for (const msg of messages) {
    const headers = msg.payload?.headers ?? []
    const getHeader = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ""

    const from = getHeader("From")
    const subject = getHeader("Subject")
    const dateStr = getHeader("Date")
    const date = dateStr ? new Date(dateStr) : new Date()
    const snippet = msg.snippet ?? ""
    const internalDate = msg.internalDate ? parseInt(msg.internalDate) : null

    if (msg.id === sentMessageId) {
      foundSent = true
      continue
    }

    if (foundSent) {
      const msgDate = internalDate ? new Date(internalDate) : date
      const fromEmail = extractEmailAddress(from)
      if (fromEmail.toLowerCase() === hrEmail.toLowerCase() && msgDate >= sentAt) {
        replies.push({ messageId: msg.id!, from, subject, snippet, date: msgDate })
      }
    }
  }

  return replies
}

export async function pollRepliesForUser(
  userId: string,
  emailAccountId: string,
  oauthToken: string,
  accountEmail: string
): Promise<number> {
  const gmail = getGmailClient(oauthToken, emailAccountId)

  const sentRecipients = await prisma.batchRecipient.findMany({
    where: {
      batch: { userId, emailAccountId },
      status: { in: ["SENT", "APPLIED"] },
      sentAt: { not: null },
      gmailThreadId: { not: null },
    },
    include: {
      recipient: { select: { hrEmail: true, companyName: true } },
      batch: { select: { name: true } },
    },
  })

  if (sentRecipients.length === 0) return 0

  let newReplies = 0

  for (const br of sentRecipients) {
    try {
      if (!br.gmailThreadId) continue
      const threadMessages = await fetchThreadMessages(gmail, br.gmailThreadId)
      const replies = findReplies(threadMessages, br.gmailMessageId!, br.sentAt!, br.recipient.hrEmail)

      for (const reply of replies) {
        const existing = await prisma.reply.findFirst({
          where: { gmailThreadId: br.gmailThreadId, batchRecipientId: br.id },
        })
        if (existing) continue

        const automated = isLikelyAutomated(reply.from, reply.subject, reply.snippet)

        await prisma.reply.create({
          data: {
            batchRecipientId: br.id,
            gmailThreadId: br.gmailThreadId,
            snippet: reply.snippet.substring(0, 500),
            receivedAt: reply.date,
            isLikelyAutomated: automated,
          },
        })

        if (!automated) {
          await prisma.batchRecipient.update({
            where: { id: br.id },
            data: { status: "REPLY" },
          })
        }

        const logMessage = `${automated ? "Auto-reply" : "Reply"} from ${br.recipient.companyName}: ${reply.subject.substring(0, 100)}`

        await prisma.activityLog.create({
          data: {
            userId,
            batchId: br.batchId,
            batchRecipientId: br.id,
            eventType: automated ? "AUTO_REPLY_DETECTED" : "REPLY_DETECTED",
            message: logMessage,
          },
        })

        await prisma.notification.create({
          data: {
            userId,
            type: "new_reply",
            title: automated
              ? `Auto-reply dari ${br.recipient.companyName}`
              : `${br.recipient.companyName} membalas lamaran Anda`,
            refId: br.id,
          },
        })

        newReplies++
      }
    } catch (err) {
      console.error(`[GmailPoll] Error processing ${br.id}:`, err instanceof Error ? err.message : err)
    }
  }

  return newReplies
}

export async function pollAllUsers(): Promise<{ totalNewReplies: number; accountsChecked: number }> {
  const accounts = await prisma.emailAccount.findMany({
    where: { provider: "GMAIL" },
    select: { id: true, userId: true, oauthToken: true, email: true },
  })

  let totalNewReplies = 0
  let accountsChecked = 0

  for (const account of accounts) {
    try {
      const count = await pollRepliesForUser(account.userId, account.id, account.oauthToken, account.email)
      totalNewReplies += count
      accountsChecked++
    } catch (err) {
      console.error(`[GmailPoll] Error polling account ${account.email}:`, err instanceof Error ? err.message : err)
    }
  }

  return { totalNewReplies, accountsChecked }
}
