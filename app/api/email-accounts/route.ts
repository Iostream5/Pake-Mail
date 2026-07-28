import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"
import { encrypt } from "@/lib/encryption"
import { google } from "googleapis"

export async function GET(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const accounts = await prisma.emailAccount.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        email: true,
        isDefault: true,
        dailyLimit: true,
        connectedAt: true,
      },
      orderBy: { connectedAt: "desc" },
    })

    return apiSuccess(accounts)
  })
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { code, redirectUri } = await request.json()
    if (!code) return apiError("Authorization code required")

    try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri || process.env.GOOGLE_REDIRECT_URI
    )

    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    const gmail = google.gmail({ version: "v1", auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: "me" })
    const email = profile.data.emailAddress!

    const encryptedTokens = encrypt(JSON.stringify(tokens))

    const account = await prisma.emailAccount.upsert({
      where: { userId_email: { userId, email } },
      create: {
        userId,
        provider: "GMAIL",
        email,
        oauthToken: encryptedTokens,
        isDefault: false,
      },
      update: {
        oauthToken: encryptedTokens,
        provider: "GMAIL",
      },
    })

    return apiSuccess({
      id: account.id,
      provider: account.provider,
      email: account.email,
      isDefault: account.isDefault,
    })
  } catch (error) {
    console.error("Gmail OAuth error:", error)
    return apiError("Failed to connect Gmail account")
  }
  })
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { id } = await request.json()
    if (!id) return apiError("Account ID required")

    const account = await prisma.emailAccount.findFirst({
      where: { id, userId },
      include: { batches: { where: { status: { in: ["RUNNING", "SCHEDULED", "PAUSED"] } } } },
    })

    if (!account) return apiError("Account not found", 404)
    if (account.batches.length > 0) {
      return apiError("Disconnect all active batches using this account first", 409)
    }

    await prisma.emailAccount.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  })
}
