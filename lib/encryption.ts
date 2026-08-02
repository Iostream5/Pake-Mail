import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const KEY_BYTES = 32

function getKey(): Buffer {
  const raw = process.env.OAUTH_TOKEN_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      "OAUTH_TOKEN_ENCRYPTION_KEY is not set"
    )
  }
  const key = Buffer.from(raw, "hex")
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `OAUTH_TOKEN_ENCRYPTION_KEY must be ${KEY_BYTES * 2} hex chars (aes-256 key)`
    )
  }
  return key
}

export function encrypt(text: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  const authTag = cipher.getAuthTag().toString("hex")
  return `${iv.toString("hex")}:${authTag}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  const key = getKey()
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":")
  const iv = Buffer.from(ivHex!, "hex")
  const authTag = Buffer.from(authTagHex!, "hex")
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encrypted!, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}
