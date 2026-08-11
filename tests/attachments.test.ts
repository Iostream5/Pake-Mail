import assert from "node:assert/strict"
import {
  AttachmentError,
  assertMessageWithinLimit,
  buildMimeMessage,
  contentTypeFromHeader,
  fetchAttachmentFile,
  safeFilename,
  type AttachmentFile,
} from "@/lib/attachments"

let passed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ok  ${name}`)
  } catch (err) {
    console.error(`FAIL  ${name}`)
    throw err
  }
}

const PDF_BYTES = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n%%EOF\n")
const DOC_BYTES = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x11, 0x22, 0x33])
const DOCX_BYTES = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("dummy [Content_Types].xml zip")])
const XLSX_BYTES = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("dummy workbook.xml zip")])
const PPTX_BYTES = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("dummy slide1.xml zip")])
const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from("dummy IHDR payload with \x00\x01\x02 binary bytes"),
])
const JPG_BYTES = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("JFIF dummy payload")])
const GIF_BYTES = Buffer.concat([Buffer.from("GIF89a"), Buffer.from("dummy payload")])
const WEBP_BYTES = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x00, 0x00, 0x00, 0x00]), Buffer.from("WEBPVP8 ")])
const TXT_BYTES = Buffer.from("Halo Pake Mail\nbaris kedua\n")
const CSV_BYTES = Buffer.from("nama,email,posisi\nBudi,budi@example.com,HRD\n")
const ZIP_BYTES = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("dummy zip entry")])

function att(name: string, bytes: Buffer, contentType: string): AttachmentFile {
  return { name, buffer: bytes, contentType }
}

function parseBoundary(mime: string): string {
  const match = /boundary="([^"]+)"/.exec(mime)
  assert.ok(match, "multipart boundary must exist")
  return match![1]
}

interface ParsedPart {
  contentType: string | null
  filename: string | null
  content: Buffer
}

function parseParts(mime: string, boundary: string): ParsedPart[] {
  const parts: ParsedPart[] = []
  for (const raw of mime.split(`--${boundary}`)) {
    if (raw === "" || raw === "\r\n" || raw.trim() === "--") continue
    const body = raw.startsWith("\r\n") ? raw.slice(2) : raw
    const headerEnd = body.indexOf("\r\n\r\n")
    const headerBlock = headerEnd === -1 ? body : body.slice(0, headerEnd)
    const payload = headerEnd === -1 ? "" : body.slice(headerEnd + 4)
    const headers = new Map<string, string>()
    for (const line of headerBlock.split("\r\n")) {
      const idx = line.indexOf(":")
      if (idx === -1) continue
      headers.set(line.slice(0, idx).trim().toLowerCase(), line.slice(idx + 1).trim())
    }
    const contentType = headers.get("content-type") ?? null
    if (contentType?.startsWith("multipart/")) continue
    const disposition = headers.get("content-disposition") ?? null
    let filename: string | null = null
    if (disposition) {
      const star = /filename\*=(?:UTF-8''|utf-8'')([^;]+)/.exec(disposition)
      const plain = /filename="([^"]*)"/.exec(disposition)
      filename = star ? decodeURIComponent(star[1]) : plain ? plain[1] : null
    }
    const content = Buffer.from(payload.replace(/\r\n/g, ""), "base64")
    parts.push({ contentType, filename, content })
  }
  return parts
}

function roundTrip(name: string, bytes: Buffer, contentType: string) {
  const mime = buildMimeMessage({
    from: "sender@example.com",
    to: "hr@example.com",
    subject: "Lamaran Pekerjaan",
    body: "Halo, ini email lamaran.",
    attachments: [att(name, bytes, contentType)],
  })
  const parts = parseParts(mime, parseBoundary(mime))
  const match = parts.find((p) => p.contentType === contentType)
  assert.ok(match, `${contentType} part must exist`)
  assert.equal(match.filename, safeFilename(name))
  assert.ok(match.content.equals(bytes), "decoded attachment bytes must equal original bytes exactly")
}

console.log("== attachment: per-type byte round-trips ==")
test("PDF attachment bytes preserved", () =>
  roundTrip("CV - Budi.pdf", PDF_BYTES, "application/pdf"))
test("DOC attachment bytes preserved", () =>
  roundTrip("surat.doc", DOC_BYTES, "application/msword"))
test("DOCX attachment bytes preserved", () =>
  roundTrip("cv.docx", DOCX_BYTES, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
test("XLSX attachment bytes preserved", () =>
  roundTrip("data.xlsx", XLSX_BYTES, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
test("PPTX attachment bytes preserved", () =>
  roundTrip("presentasi.pptx", PPTX_BYTES, "application/vnd.openxmlformats-officedocument.presentationml.presentation"))
test("PNG attachment bytes preserved", () =>
  roundTrip("foto.png", PNG_BYTES, "image/png"))
test("JPG attachment bytes preserved", () =>
  roundTrip("foto.jpg", JPG_BYTES, "image/jpeg"))
test("GIF attachment bytes preserved", () =>
  roundTrip("animasi.gif", GIF_BYTES, "image/gif"))
test("WEBP attachment bytes preserved", () =>
  roundTrip("foto.webp", WEBP_BYTES, "image/webp"))
test("TXT attachment bytes preserved", () =>
  roundTrip("catatan.txt", TXT_BYTES, "text/plain"))
test("CSV attachment bytes preserved", () =>
  roundTrip("daftar.csv", CSV_BYTES, "text/csv"))
test("ZIP attachment bytes preserved", () =>
  roundTrip("arsip.zip", ZIP_BYTES, "application/zip"))

console.log("== attachment: multipart structure ==")
test("all header lines and parts use CRLF", () => {
  const mime = buildMimeMessage({
    from: "a@example.com",
    to: "b@example.com",
    subject: "Subjek",
    body: "Isi",
    attachments: [att("a.pdf", PDF_BYTES, "application/pdf")],
  })
  assert.ok(!mime.includes("\n") || mime.includes("\r\n"), "no bare LF")
  const loneLf = mime.split("\r\n").some((line) => line.includes("\n") || line.includes("\r"))
  assert.equal(loneLf, false, "every line separator is exactly \\r\\n")
})
test("multiple attachments each get their own MIME section, order preserved", () => {
  const mime = buildMimeMessage({
    from: "a@example.com",
    to: "b@example.com",
    subject: "Subjek",
    body: "Isi",
    attachments: [
      att("1.pdf", PDF_BYTES, "application/pdf"),
      att("2.png", PNG_BYTES, "image/png"),
      att("3.csv", CSV_BYTES, "text/csv"),
    ],
  })
  const boundary = parseBoundary(mime)
  const parts = parseParts(mime, boundary)
  assert.equal(parts.length, 4)
  assert.equal(parts[1].filename, "1.pdf")
  assert.equal(parts[2].filename, "2.png")
  assert.equal(parts[3].filename, "3.csv")
  assert.ok(parts[1].content.equals(PDF_BYTES))
  assert.ok(parts[2].content.equals(PNG_BYTES))
  assert.ok(parts[3].content.equals(CSV_BYTES))
})
test("body text part has correct Content-Type", () => {
  const mime = buildMimeMessage({
    from: "a@example.com",
    to: "b@example.com",
    subject: "Subjek",
    body: "Isi surat",
    attachments: [att("a.png", PNG_BYTES, "image/png")],
  })
  const parts = parseParts(mime, parseBoundary(mime))
  assert.equal(parts[0].contentType, "text/plain; charset=UTF-8")
  assert.equal(parts[0].content.toString("utf8"), "Isi surat")
})
test("boundary terminates the multipart/mixed message", () => {
  const mime = buildMimeMessage({
    from: "a@example.com",
    to: "b@example.com",
    subject: "Subjek",
    body: "Isi",
    attachments: [att("a.pdf", PDF_BYTES, "application/pdf")],
  })
  const boundary = parseBoundary(mime)
  assert.ok(mime.endsWith(`\r\n--${boundary}--`), "message ends with closing boundary")
})
test("Gmail raw encodes the message exactly once (single base64url pass)", () => {
  const mime = buildMimeMessage({
    from: "a@example.com",
    to: "b@example.com",
    subject: "Subjek",
    body: "Isi",
    attachments: [att("a.pdf", PDF_BYTES, "application/pdf")],
  })
  const raw = Buffer.from(mime, "utf8").toString("base64url")
  const decoded = Buffer.from(raw, "base64url").toString("utf8")
  assert.equal(decoded, mime, "base64url round-trip back to the exact MIME string")
})

console.log("== attachment: content type detection ==")
test("contentTypeFromHeader normalizes and strips parameters", () => {
  assert.equal(contentTypeFromHeader("application/pdf"), "application/pdf")
  assert.equal(contentTypeFromHeader("IMAGE/PNG; charset=binary"), "image/png")
  assert.equal(contentTypeFromHeader("   Text/Plain ; charset=utf-8 "), "text/plain")
})
test("contentTypeFromHeader unknown -> null -> octet-stream fallback", () => {
  assert.equal(contentTypeFromHeader(null), null)
  assert.equal(contentTypeFromHeader(""), null)
  assert.equal(contentTypeFromHeader("   "), null)
  assert.equal(contentTypeFromHeader("; charset=binary"), null)
})
test("fetchAttachmentFile reads binary bytes and stored content type", async () => {
  const fetcher = async () =>
    new Response(new Uint8Array(PNG_BYTES), {
      status: 200,
      headers: { "content-type": "image/png; charset=binary" },
    })
  const fetched = await fetchAttachmentFile("https://storage.test/file.png", "foto.png", fetcher)
  assert.equal(fetched.contentType, "image/png")
  assert.ok(fetched.buffer.equals(PNG_BYTES))
})
test("fetchAttachmentFile falls back to octet-stream when header missing", async () => {
  const fetcher = async () => new Response(new Uint8Array(ZIP_BYTES), { status: 200 })
  const fetched = await fetchAttachmentFile("https://storage.test/file.bin", "arsip.bin", fetcher)
  assert.equal(fetched.contentType, "application/octet-stream")
  assert.ok(fetched.buffer.equals(ZIP_BYTES))
})
test("fetchAttachmentFile HTTP failure is classified as attachment error", async () => {
  const fetcher = async () => new Response("nope", { status: 500 })
  await assert.rejects(
    () => fetchAttachmentFile("https://storage.test/missing.pdf", "missing.pdf", fetcher),
    (err) => err instanceof AttachmentError && err.category === "attachment"
  )
})
test("fetchAttachmentFile network failure is classified as attachment error", async () => {
  const fetcher = async () => {
    throw new Error("socket hang up")
  }
  await assert.rejects(
    () => fetchAttachmentFile("https://storage.test/boom.pdf", "boom.pdf", fetcher),
    (err) => err instanceof AttachmentError && err.category === "attachment"
  )
})
test("unknown MIME type in buildMimeMessage is emitted as-is and fails open to octet-stream from fetch", async () => {
  const fetched = await fetchAttachmentFile(
    "https://storage.test/weird.bin",
    "weird.bin",
    async () => new Response(new Uint8Array(DOC_BYTES), { status: 200, headers: { "content-type": "application/x-very-weird" } })
  )
  assert.equal(fetched.contentType, "application/x-very-weird")
  const mime = buildMimeMessage({
    from: "a@example.com",
    to: "b@example.com",
    subject: "s",
    body: "b",
    attachments: [att("weird.bin", fetched.buffer, fetched.contentType)],
  })
  const parts = parseParts(mime, parseBoundary(mime))
  assert.equal(parts[1].contentType, "application/x-very-weird")
})

console.log("== attachment: filenames ==")
test("filename with spaces round-trips", () => {
  const mime = buildMimeMessage({
    from: "a@example.com",
    to: "b@example.com",
    subject: "s",
    body: "b",
    attachments: [att("My Resume final (2).pdf", PDF_BYTES, "application/pdf")],
  })
  const parts = parseParts(mime, parseBoundary(mime))
  assert.equal(parts[1].filename, "My Resume final (2).pdf")
})
test("filename with non-ASCII characters round-trips via filename*", () => {
  const name = "Laporan – Résumé 2026.pdf"
  const mime = buildMimeMessage({
    from: "a@example.com",
    to: "b@example.com",
    subject: "s",
    body: "b",
    attachments: [att(name, PDF_BYTES, "application/pdf")],
  })
  const parts = parseParts(mime, parseBoundary(mime))
  assert.equal(parts[1].filename, name)
  const disposition = /Content-Disposition: ([^\r]+)/.exec(mime.split("\r\n").find((l) => l.startsWith("Content-Disposition:"))!)!
  assert.ok(disposition[1].includes("filename*="), "non-ASCII name must use filename* parameter")
})
test("long filename is truncated deterministically", () => {
  const longName = "a".repeat(300) + ".pdf"
  const mime = buildMimeMessage({
    from: "a@example.com",
    to: "b@example.com",
    subject: "s",
    body: "b",
    attachments: [att(longName, PDF_BYTES, "application/pdf")],
  })
  const parts = parseParts(mime, parseBoundary(mime))
  assert.equal(parts[1].filename, safeFilename(longName))
  assert.ok(parts[1].filename!.length <= 255)
})
test("empty/invalid filename falls back to 'attachment'", () => {
  for (const bad of ["", "   ", "\r\n", "\u0000"]) {
    const mime = buildMimeMessage({
      from: "a@example.com",
      to: "b@example.com",
      subject: "s",
      body: "b",
      attachments: [att(bad, PDF_BYTES, "application/pdf")],
    })
    const parts = parseParts(mime, parseBoundary(mime))
    assert.equal(parts[1].filename, "attachment", `fallback for ${JSON.stringify(bad)}`)
  }
})
test("filename containing CR/LF/quote is sanitized, no header injection", () => {
  const evil = "safe\r\nBcc: attacker@example.com\"\".pdf"
  const mime = buildMimeMessage({
    from: "a@example.com",
    to: "b@example.com",
    subject: "s",
    body: "b",
    attachments: [att(evil, PDF_BYTES, "application/pdf")],
  })
  assert.ok(!mime.includes("\r\nBcc:"), "no injected header via CRLF")
  assert.ok(mime.split("\r\n").every((line) => !line.toLowerCase().startsWith("bcc:")), "no Bcc header line")
  const parts = parseParts(mime, parseBoundary(mime))
  assert.equal(parts[1].filename, safeFilename(evil))
})

console.log("== attachment: size limit and unknown bytes ==")
test("message within Gmail limit passes validation", () => {
  const mime = buildMimeMessage({
    from: "a@example.com",
    to: "b@example.com",
    subject: "s",
    body: "b",
    attachments: [att("small.pdf", PDF_BYTES, "application/pdf")],
  })
  assert.doesNotThrow(() => assertMessageWithinLimit(Buffer.from(mime, "utf8").toString("base64url")))
})
test("attachment larger than 25 MB triggers attachment-classified failure", () => {
  const big = Buffer.alloc(26 * 1024 * 1024, 0x61)
  const mime = buildMimeMessage({
    from: "a@example.com",
    to: "b@example.com",
    subject: "s",
    body: "b",
    attachments: [att("big.bin", big, "application/octet-stream")],
  })
  const raw = Buffer.from(mime, "utf8").toString("base64url")
  assert.throws(() => assertMessageWithinLimit(raw), (err) => err instanceof AttachmentError)
})
test("binary bytes that are not valid UTF-8 survive base64 MIME encoding", () => {
  const bytes = Buffer.from([0xff, 0xfe, 0x00, 0xfd, 0x80, 0x81, 0xff, 0x00, 0x7f])
  const mime = buildMimeMessage({
    from: "a@example.com",
    to: "b@example.com",
    subject: "s",
    body: "b",
    attachments: [att("raw.bin", bytes, "application/octet-stream")],
  })
  const parts = parseParts(mime, parseBoundary(mime))
  assert.ok(parts[1].content.equals(bytes), "non-UTF-8 bytes must round-trip exactly")
})
test("attachment base64 appears exactly once per attachment section", () => {
  const mime = buildMimeMessage({
    from: "a@example.com",
    to: "b@example.com",
    subject: "s",
    body: "b",
    attachments: [att("a.bin", PNG_BYTES, "application/octet-stream")],
  })
  const sections = mime.split(`--${parseBoundary(mime)}`)
  const payload = sections[2].slice(sections[2].indexOf("\r\n\r\n") + 4)
  const rawPayload = payload.replace(/\r\n/g, "")
  assert.equal(Buffer.from(rawPayload, "base64").toString("base64"), rawPayload, "payload is single base64 encoding")
  assert.ok(!rawPayload.includes("base64"), "no double encoding marker")
})

console.log(`\nAll ${passed} tests passed.`)
