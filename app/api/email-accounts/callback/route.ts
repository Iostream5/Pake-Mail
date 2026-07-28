import { prisma } from "@/lib/prisma"
import { requireUserId } from "@/lib/api-helpers"
import { encrypt } from "@/lib/encryption"
import { google } from "googleapis"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const errorParam = searchParams.get("error")

  if (errorParam || !code) {
    return new Response(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error</title></head><body><script>window.opener.postMessage({type:"oauth-error",error:"' + (errorParam || "no_code") + '"},window.location.origin);window.close()</script></body></html>',
      { headers: { "Content-Type": "text/html;charset=utf-8" } }
    )
  }

  try {
    const userId = await requireUserId()

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    const gmail = google.gmail({ version: "v1", auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: "me" })
    const email = profile.data.emailAddress!

    const encryptedTokens = encrypt(JSON.stringify(tokens))

    await prisma.emailAccount.upsert({
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

    return new Response(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Connected</title></head><body><script>window.opener.postMessage({type:"oauth-success"},"*");window.close()</script></body></html>',
      { headers: { "Content-Type": "text/html;charset=utf-8" } }
    )
  } catch (err) {
    console.error("Gmail OAuth callback error:", err)
    return new Response(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error</title></head><body><script>window.opener.postMessage({type:"oauth-error",error:"server_error"},window.location.origin);window.close()</script></body></html>',
      { headers: { "Content-Type": "text/html;charset=utf-8" } }
    )
  }
}
