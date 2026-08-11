import { prisma } from "@/lib/prisma"
import { getSignedFileUrl } from "@/lib/storage"

const GMAIL_MESSAGE_LIMIT_BYTES = 25 * 1024 * 1024
const FILE_CACHE_TTL_MS = 10 * 60 * 1000
const FILE_CACHE_MAX_BYTES = 128 * 1024 * 1024

export class AttachmentError extends Error {
  readonly category = "attachment" as const
}

export interface AttachmentFile {
  name: string
  buffer: Buffer
}

interface CachedFile {
  name: string
  buffer: Buffer
  sizeBytes: number
  cachedAt: number
}

const fileCache = new Map<string, CachedFile>()
let cacheBytes = 0

function touchCache(key: string): void {
  const entry = fileCache.get(key)
  if (entry) {
    fileCache.delete(key)
    fileCache.set(key, entry)
  }
}

function evictCache(): void {
  while (cacheBytes > FILE_CACHE_MAX_BYTES && fileCache.size > 0) {
    const oldestKey = fileCache.keys().next().value
    if (oldestKey === undefined) break
    const entry = fileCache.get(oldestKey)
    if (entry) {
      cacheBytes -= entry.sizeBytes
      fileCache.delete(oldestKey)
    }
  }
}

export async function loadAttachmentFiles(documentIds: string[]): Promise<AttachmentFile[]> {
  if (documentIds.length === 0) return []

  const documents = await prisma.document.findMany({
    where: { id: { in: documentIds } },
  })

  const files: AttachmentFile[] = []
  for (const doc of documents) {
    const cached = fileCache.get(doc.fileUrl)
    if (cached && Date.now() - cached.cachedAt < FILE_CACHE_TTL_MS) {
      touchCache(doc.fileUrl)
      files.push({ name: cached.name, buffer: cached.buffer })
      continue
    }

    const url = await getSignedFileUrl(doc.fileUrl)
    const response = await fetch(url)
    if (!response.ok) {
      throw new AttachmentError(
        `Gagal mengunduh lampiran "${doc.name}": server storage merespon HTTP ${response.status}`
      )
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    const entry: CachedFile = {
      name: doc.name,
      buffer,
      sizeBytes: buffer.byteLength,
      cachedAt: Date.now(),
    }

    if (cached) cacheBytes -= cached.sizeBytes
    cacheBytes += entry.sizeBytes
    fileCache.set(doc.fileUrl, entry)
    evictCache()

    files.push({ name: entry.name, buffer: entry.buffer })
  }
  return files
}

export function encodeMimeWord(text: string): string {
  return `=?UTF-8?B?${Buffer.from(text, "utf8").toString("base64")}?=`
}

export function buildMimeMessage(opts: {
  from: string
  to: string
  subject: string
  body: string
  attachments?: AttachmentFile[]
}): string {
  const boundary = `boundary${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  const parts: string[] = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${encodeMimeWord(opts.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(opts.body, "utf8").toString("base64"),
  ]

  for (const attachment of opts.attachments ?? []) {
    parts.push(
      `--${boundary}`,
      "Content-Type: application/octet-stream",
      `Content-Disposition: attachment; filename="${encodeMimeWord(attachment.name)}"`,
      "Content-Transfer-Encoding: base64",
      "",
      attachment.buffer.toString("base64")
    )
  }

  parts.push(`--${boundary}--`)
  return parts.join("\r\n")
}

export function assertMessageWithinLimit(rawBase64Url: string): void {
  const bytes = Buffer.byteLength(rawBase64Url)
  if (bytes > GMAIL_MESSAGE_LIMIT_BYTES) {
    const mb = (bytes / 1024 / 1024).toFixed(1)
    throw new AttachmentError(
      `Ukuran pesan (${mb} MB) melebihi batas Gmail 25MB. Hapus atau perkecil lampiran.`
    )
  }
}
