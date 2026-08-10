import { prisma } from "@/lib/prisma"
import { getSignedFileUrl } from "@/lib/storage"

interface CacheEntry {
  buffer: Buffer
  expiry: number
  size: number
}

class AttachmentCache {
  private cache = new Map<string, CacheEntry>()
  private totalBytes = 0
  private maxBytes = 50 * 1024 * 1024 // 50MB total cache size limit
  private ttl = 10 * 60 * 1000 // 10 minutes

  public getCacheSize(): number {
    return this.cache.size
  }

  public getTotalBytes(): number {
    return this.totalBytes
  }

  get(key: string): Buffer | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiry) {
      this.delete(key)
      return null
    }
    // Refresh LRU by re-inserting
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.buffer
  }

  set(key: string, buffer: Buffer) {
    this.delete(key) // ensure no duplicate
    const size = buffer.byteLength

    // Evict until we have space
    while (this.totalBytes + size > this.maxBytes && this.cache.size > 0) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.delete(oldestKey)
      } else {
        break
      }
    }

    this.cache.set(key, {
      buffer,
      expiry: Date.now() + this.ttl,
      size,
    })
    this.totalBytes += size
  }

  private delete(key: string) {
    const entry = this.cache.get(key)
    if (entry) {
      this.totalBytes -= entry.size
      this.cache.delete(key)
    }
  }

  public clear() {
    this.cache.clear()
    this.totalBytes = 0
  }
}

export const attachmentCache = new AttachmentCache()

export function encodeUTF8Base64(str: string): string {
  return `=?UTF-8?B?${Buffer.from(str).toString("base64")}?=`
}

export function assembleMimeMessage({
  from,
  to,
  subject,
  body,
  attachments,
}: {
  from: string
  to: string
  subject: string
  body: string
  attachments: { filename: string; content: Buffer }[]
}): { raw: string; totalSize: number } {
  const boundary = `boundary${Date.now()}`
  const encodedSubject = encodeUTF8Base64(subject)

  const mimeParts: string[] = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(body).toString("base64"),
  ]

  for (const att of attachments) {
    const encodedFilename = encodeUTF8Base64(att.filename)
    mimeParts.push(
      `--${boundary}`,
      `Content-Type: application/octet-stream`,
      `Content-Disposition: attachment; filename="${encodedFilename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      att.content.toString("base64")
    )
  }

  mimeParts.push(`--${boundary}--`)

  // Join parts with \r\n
  const mimeMessage = mimeParts.join("\r\n")
  const raw = Buffer.from(mimeMessage, "utf-8").toString("base64url")
  const totalSize = Buffer.byteLength(mimeMessage, "utf-8")

  return { raw, totalSize }
}

export async function fetchAttachments(documentIds: string[]): Promise<{ filename: string; content: Buffer }[]> {
  if (documentIds.length === 0) return []

  const docs = await prisma.document.findMany({
    where: { id: { in: documentIds } },
  })

  const results: { filename: string; content: Buffer }[] = []

  for (const doc of docs) {
    const storageKey = doc.fileUrl
    let buffer = attachmentCache.get(storageKey)
    if (!buffer) {
      const url = await getSignedFileUrl(doc.fileUrl)
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`AttachmentError: Gagal mengunduh lampiran "${doc.name}" dari storage (HTTP ${res.status})`)
      }
      const arrayBuf = await res.arrayBuffer()
      buffer = Buffer.from(arrayBuf)
      attachmentCache.set(storageKey, buffer)
    }
    results.push({ filename: doc.name, content: buffer })
  }

  return results
}
