import { prisma } from "@/lib/prisma"
import { getSignedFileUrl } from "@/lib/storage"

const GMAIL_MESSAGE_LIMIT_BYTES = 25 * 1024 * 1024
const FILE_CACHE_TTL_MS = 10 * 60 * 1000
const FILE_CACHE_MAX_BYTES = 128 * 1024 * 1024
const FALLBACK_CONTENT_TYPE = "application/octet-stream"
const MAX_FILENAME_LENGTH = 255

export class AttachmentError extends Error {
  readonly category = "attachment" as const
}

export interface AttachmentFile {
  name: string
  buffer: Buffer
  contentType: string
  documentId?: string
}

interface CachedFile {
  name: string
  buffer: Buffer
  sizeBytes: number
  cachedAt: number
  contentType: string
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

export function contentTypeFromHeader(header: string | null): string | null {
  if (!header) return null
  const normalized = header.trim().toLowerCase()
  if (normalized.length === 0) return null
  const withoutParams = normalized.split(";")[0].trim()
  return withoutParams.length === 0 ? null : withoutParams
}

export function safeFilename(name: string): string {
  let cleaned = String(name ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/"/g, " ")
    .trim()
  if (cleaned.length === 0) cleaned = "attachment"
  return cleaned.slice(0, MAX_FILENAME_LENGTH)
}

export function asciiFilename(name: string): string {
  return safeFilename(name).replace(/[^\x20-\x7e]/g, "_")
}

export interface AttachmentFetchResult {
  buffer: Buffer
  contentType: string
}

export async function fetchAttachmentFile(
  url: string,
  docName: string,
  fetcher: typeof fetch = fetch
): Promise<AttachmentFetchResult> {
  let response: Response
  try {
    response = await fetcher(url)
  } catch (err) {
    throw new AttachmentError(
      `Gagal mengunduh lampiran "${docName}": ${err instanceof Error ? err.message : String(err)}`
    )
  }

  if (!response.ok) {
    throw new AttachmentError(
      `Gagal mengunduh lampiran "${docName}": server storage merespon HTTP ${response.status}`
    )
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(await response.arrayBuffer())
  } catch (err) {
    throw new AttachmentError(
      `Gagal mengunduh lampiran "${docName}": ${err instanceof Error ? err.message : String(err)}`
    )
  }

  return {
    buffer,
    contentType: contentTypeFromHeader(response.headers.get("content-type")) ?? FALLBACK_CONTENT_TYPE,
  }
}

export interface AttachmentLoadResult {
  files: AttachmentFile[]
  documents: Array<{ id: string; name: string; category: string; fileUrl: string }>
}

export async function loadAttachmentsWithMeta(documentIds: string[]): Promise<AttachmentLoadResult> {
  if (documentIds.length === 0) return { files: [], documents: [] }

  const documents = await prisma.document.findMany({
    where: { id: { in: documentIds } },
    orderBy: { createdAt: "asc" },
  })

  const files: AttachmentFile[] = []
  for (const doc of documents) {
    const cached = fileCache.get(doc.fileUrl)
    if (cached && Date.now() - cached.cachedAt < FILE_CACHE_TTL_MS) {
      touchCache(doc.fileUrl)
      files.push({ name: cached.name, buffer: cached.buffer, contentType: cached.contentType, documentId: doc.id })
      continue
    }

    try {
      const url = await getSignedFileUrl(doc.fileUrl)
      const fetched = await fetchAttachmentFile(url, doc.name)
      const entry: CachedFile = {
        name: doc.name,
        buffer: fetched.buffer,
        sizeBytes: fetched.buffer.byteLength,
        cachedAt: Date.now(),
        contentType: fetched.contentType,
      }

      if (cached) cacheBytes -= cached.sizeBytes
      cacheBytes += entry.sizeBytes
      fileCache.set(doc.fileUrl, entry)
      evictCache()

      files.push({ name: entry.name, buffer: entry.buffer, contentType: entry.contentType, documentId: doc.id })
    } catch (err) {
      if (err instanceof AttachmentError) throw err
      throw new AttachmentError(
        `Gagal mengunduh lampiran "${doc.name}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
  return {
    files,
    documents: documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      category: doc.category,
      fileUrl: doc.fileUrl,
    })),
  }
}

export async function loadAttachmentFiles(documentIds: string[]): Promise<AttachmentFile[]> {
  const { files } = await loadAttachmentsWithMeta(documentIds)
  return files
}

export function encodeMimeWord(text: string): string {
  return `=?UTF-8?B?${Buffer.from(text, "utf8").toString("base64")}?=`
}

function percentEncodeFilename(name: string): string {
  return encodeURIComponent(safeFilename(name))
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
    const name = safeFilename(attachment.name)
    parts.push(
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}`,
      `Content-Disposition: attachment; filename="${asciiFilename(name)}"; filename*=UTF-8''${percentEncodeFilename(name)}`,
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