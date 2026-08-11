import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import PizZip from "pizzip"
import {
  LetterTemplateError,
  formatLetterDate,
  renderDocxTemplate,
  SUPPORTED_VARIABLES,
  type TemplateVariables,
} from "@/lib/document-template"
import {
  convertDocxToPdf,
  GotenbergConversionError,
  GotenbergUnavailableError,
} from "@/lib/gotenberg"
import {
  findLetterTemplate,
  isDocxDocument,
  letterAttachmentName,
  renderApplicationLetter,
} from "@/lib/letter"

process.env.GOTENBERG_URL = "http://gotenberg.test:3000"

let passed = 0
const pending: Promise<void>[] = []

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const result = fn()
    if (result instanceof Promise) {
      pending.push(
        result.then(
          () => {
            passed++
            console.log(`  ok  ${name}`)
          },
          (err) => {
            console.error(`FAIL  ${name}`)
            console.error(err)
            process.exitCode = 1
            throw err
          }
        )
      )
      return
    }
    passed++
    console.log(`  ok  ${name}`)
  } catch (err) {
    console.error(`FAIL  ${name}`)
    throw err
  }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

interface FixtureRun {
  text: string
  bold?: boolean
}

function makeDocx(paragraphs: FixtureRun[][]): Buffer {
  const zip = new PizZip()
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  )
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  )
  const body = paragraphs
    .map(
      (runs) =>
        `<w:p>` +
        runs
          .map(
            (r) =>
              `<w:r>${r.bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${escapeXml(r.text)}</w:t></w:r>`
          )
          .join("") +
        `</w:p>`
    )
    .join("")
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}<w:sectPr/></w:body>
</w:document>`
  )
  return Buffer.from(zip.generate({ type: "nodebuffer" }))
}

function extractText(docx: Buffer): string {
  const zip = new PizZip(docx)
  const documentXml = zip.file("word/document.xml")
  assert.ok(documentXml, "rendered docx must contain word/document.xml")
  const xml = documentXml.asText()
  const texts = [...xml.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => m[1])
  return texts.join("")
}

const FULL_TEMPLATE = makeDocx([
  [{ text: "Yth. HRD " }, { text: "{{company}}" }],
  [{ text: "Saya melamar posisi {{position}} di {{company}}." }],
  [{ text: "Tanggal: {{date}}" }],
])

const VARS: TemplateVariables = {
  company: "PT ABC Indonesia",
  position: "Operator Produksi",
  date: "12 Agustus 2026",
}

const PDF_BYTES = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n%%EOF\n")

function gotenbergFetcher(status = 200, body: Buffer = PDF_BYTES): typeof fetch {
  return async (input: URL | RequestInfo, init?: RequestInit) => {
    assert.ok(String(input).includes("/forms/libreoffice/convert"), "must call convert endpoint")
    assert.ok(init && init.body instanceof FormData, "must send multipart form")
    return new Response(new Uint8Array(body), {
      status,
      headers: { "content-type": "application/pdf" },
    })
  }
}

function contentAwareFetcher(): typeof fetch {
  return async (_input: URL | RequestInfo, init?: RequestInit) => {
    assert.ok(init && init.body instanceof FormData, "must send multipart form")
    const blob = init.body.get("files") as Blob
    const bytes = Buffer.from(await blob.arrayBuffer())
    const hash = createHash("sha1").update(bytes).digest("hex").slice(0, 8)
    const pdf = Buffer.from(`%PDF-1.4\n%%content-${hash}%%\n%%EOF\n`)
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: { "content-type": "application/pdf" },
    })
  }
}

const TEMPLATE_DOC = {
  id: "doc_letter",
  name: "Template Lamaran.docx",
  fileUrl: "documents/user/123-Template Lamaran.docx",
  category: "SURAT_LAMARAN",
}

console.log("== letter: placeholder replacement ==")
test("{{company}} is replaced", () => {
  const docx = makeDocx([[{ text: "Yth. HRD {{company}}" }]])
  const out = renderDocxTemplate(docx, { ...VARS, company: "PT XYZ Indonesia" })
  assert.ok(extractText(out).includes("Yth. HRD PT XYZ Indonesia"))
})
test("{{position}} is replaced", () => {
  const docx = makeDocx([[{ text: "posisi {{position}}." }]])
  const out = renderDocxTemplate(docx, { ...VARS, position: "Staff IT" })
  assert.ok(extractText(out).includes("posisi Staff IT."))
})
test("{{date}} is replaced", () => {
  const docx = makeDocx([[{ text: "{{date}}" }]])
  const out = renderDocxTemplate(docx, { ...VARS, date: "1 Januari 2030" })
  assert.ok(extractText(out).includes("1 Januari 2030"))
})
test("multiple occurrences of the same variable all replaced", () => {
  const out = renderDocxTemplate(FULL_TEMPLATE, VARS)
  const text = extractText(out)
  assert.equal(text.match(/PT ABC Indonesia/g)?.length, 2)
  assert.ok(text.includes("Yth. HRD PT ABC Indonesia"))
  assert.ok(text.includes("posisi Operator Produksi di PT ABC Indonesia."))
  assert.ok(text.includes("Tanggal: 12 Agustus 2026"))
  assert.ok(!text.includes("{{"))
})
test("placeholder split across multiple runs is replaced", () => {
  const docx = makeDocx([
    [{ text: "Yth. HRD " }, { text: "{{compa" }, { text: "ny}}" }],
  ])
  const out = renderDocxTemplate(docx, { ...VARS, company: "PT Split Test" })
  assert.ok(extractText(out).includes("Yth. HRD PT Split Test"))
})
test("unknown variable is a permanent failure", () => {
  const docx = makeDocx([[{ text: "Halo {{hrName}}" }]])
  assert.throws(
    () => renderDocxTemplate(docx, VARS),
    (err) => err instanceof LetterTemplateError && err.category === "permanent"
  )
})
test("only supported variables are defined", () => {
  assert.deepEqual([...SUPPORTED_VARIABLES], ["company", "position", "date"])
})
test("empty or invalid docx buffer is rejected", () => {
  assert.throws(() => renderDocxTemplate(Buffer.alloc(0), VARS), LetterTemplateError)
  assert.throws(() => renderDocxTemplate(Buffer.from("not a zip"), VARS), LetterTemplateError)
})

console.log("== letter: docx validity and preservation ==")
test("rendered docx remains a valid zip with document.xml", () => {
  const out = renderDocxTemplate(FULL_TEMPLATE, VARS)
  assert.doesNotThrow(() => new PizZip(out))
  assert.ok(extractText(out).length > 0)
})
test("unrelated formatting (bold run) is preserved", () => {
  const docx = makeDocx([
    [{ text: "Yth. " }, { text: "HRD", bold: true }, { text: " {{company}}" }],
  ])
  const out = renderDocxTemplate(docx, { ...VARS, company: "PT Format" })
  const zip = new PizZip(out)
  const xml = zip.file("word/document.xml")!.asText()
  assert.ok(xml.includes("<w:b/>"), "bold run property must survive rendering")
  assert.ok(extractText(out).includes("Yth. HRD PT Format"))
})
test("original template buffer is never mutated", () => {
  const original = makeDocx([[{ text: "{{company}}" }]])
  const snapshot = Buffer.from(original)
  renderDocxTemplate(original, VARS)
  renderDocxTemplate(original, { ...VARS, company: "PT Lain" })
  assert.ok(original.equals(snapshot), "template buffer must remain byte-identical")
})

console.log("== letter: template detection ==")
test("findLetterTemplate picks SURAT_LAMARAN docx only", () => {
  const docs = [
    { id: "a", name: "CV.pdf", fileUrl: "documents/u/1-CV.pdf", category: "CV" },
    { id: "b", name: "Template.docx", fileUrl: "documents/u/2-Template.docx", category: "SURAT_LAMARAN" },
  ]
  const found = findLetterTemplate(docs)
  assert.equal(found?.id, "b")
})
test("SURAT_LAMARAN pdf is NOT a letter template", () => {
  const docs = [
    { id: "a", name: "Surat.pdf", fileUrl: "documents/u/1-Surat.pdf", category: "SURAT_LAMARAN" },
  ]
  assert.equal(findLetterTemplate(docs), null)
})
test("docx of another category is NOT a letter template", () => {
  const docs = [
    { id: "a", name: "Sertifikat.docx", fileUrl: "documents/u/1-Sertifikat.docx", category: "SERTIFIKAT" },
  ]
  assert.equal(findLetterTemplate(docs), null)
})
test("no template returns null (regression path)", () => {
  assert.equal(findLetterTemplate([]), null)
  assert.equal(findLetterTemplate([{ id: "a", name: "CV.pdf", fileUrl: "x/CV.pdf", category: "CV" }]), null)
})
test("isDocxDocument detects docx by storage key or name", () => {
  assert.equal(isDocxDocument({ fileUrl: "a/b.docx", name: "x" }), true)
  assert.equal(isDocxDocument({ fileUrl: "a/b", name: "Lamaran.DOCX" }), true)
  assert.equal(isDocxDocument({ fileUrl: "a/b.pdf", name: "Lamaran.pdf" }), false)
})

console.log("== letter: attachment filename ==")
test("letter filename is deterministic and safe", () => {
  assert.equal(letterAttachmentName("PT ABC Indonesia"), "Lamaran - PT ABC Indonesia.pdf")
  assert.equal(letterAttachmentName("PT ABC Indonesia"), letterAttachmentName("PT ABC Indonesia"))
})
test("letter filename strips control characters and quotes", () => {
  const name = letterAttachmentName('PT "EVIL"\r\nBcc: x@y.com')
  assert.ok(!name.includes("\r"), "no CR in filename")
  assert.ok(!name.includes("\n"), "no LF in filename")
  assert.ok(!name.includes('"'), "no quotes in filename")
  assert.ok(name.endsWith(".pdf"))
  assert.ok(name.length <= 255)
})
test("letter filename sanitizes non-ascii company names", () => {
  const name = letterAttachmentName("PT Café Jakarta")
  assert.ok(name.startsWith("Lamaran - PT Caf"), "non-ascii replaced deterministically")
  assert.ok(name.endsWith(".pdf"))
})

console.log("== letter: gotenberg conversion ==")
test("conversion succeeds and returns non-empty PDF buffer", async () => {
  const letter = await renderApplicationLetter(
    {
      templateDoc: TEMPLATE_DOC,
      company: "PT Test A",
      position: "Operator Produksi",
      sendDate: new Date(2026, 7, 12, 12, 0, 0),
      docxBuffer: FULL_TEMPLATE,
    },
    gotenbergFetcher()
  )
  assert.ok(letter.pdf.byteLength > 0, "pdf must be non-empty")
  assert.equal(letter.pdf.subarray(0, 5).toString("latin1"), "%PDF-")
  assert.equal(letter.filename, "Lamaran - PT Test A.pdf")
})
test("company-specific pdf differs per recipient", async () => {
  const a = await renderApplicationLetter(
    { templateDoc: TEMPLATE_DOC, company: "PT Test A", position: "Operator Produksi", sendDate: new Date(2026, 7, 12, 12, 0, 0), docxBuffer: FULL_TEMPLATE },
    contentAwareFetcher()
  )
  const b = await renderApplicationLetter(
    { templateDoc: TEMPLATE_DOC, company: "PT Test B", position: "Operator Produksi", sendDate: new Date(2026, 7, 12, 12, 0, 0), docxBuffer: FULL_TEMPLATE },
    contentAwareFetcher()
  )
  assert.notEqual(a.pdf.toString("base64"), b.pdf.toString("base64"))
  assert.ok(a.pdf.toString("latin1").includes("%%content-"), "pdf embeds a hash of the rendered docx")
  assert.ok(b.pdf.toString("latin1").includes("%%content-"), "pdf embeds a hash of the rendered docx")
})
test("original template docx is unchanged after full pipeline", async () => {
  const original = Buffer.from(FULL_TEMPLATE)
  await renderApplicationLetter(
    { templateDoc: TEMPLATE_DOC, company: "PT X", position: "Y", sendDate: new Date(), docxBuffer: original },
    gotenbergFetcher()
  )
  assert.ok(original.equals(FULL_TEMPLATE))
})
test("conversion network failure is temporary", async () => {
  const failing: typeof fetch = async () => {
    throw new Error("ECONNREFUSED gotenberg:3000")
  }
  await assert.rejects(
    renderApplicationLetter(
      { templateDoc: TEMPLATE_DOC, company: "PT A", position: "X", sendDate: new Date(), docxBuffer: FULL_TEMPLATE },
      failing
    ),
    (err) => err instanceof GotenbergUnavailableError && err.category === "temporary"
  )
})
test("conversion timeout is temporary", async () => {
  const timeout: typeof fetch = async (_url, init) => {
    const signal = init?.signal as AbortSignal
    assert.ok(signal)
    return Promise.reject(new DOMException("The operation was aborted", "TimeoutError"))
  }
  await assert.rejects(
    renderApplicationLetter(
      { templateDoc: TEMPLATE_DOC, company: "PT A", position: "X", sendDate: new Date(), docxBuffer: FULL_TEMPLATE },
      timeout
    ),
    (err) => err instanceof GotenbergUnavailableError && err.category === "temporary"
  )
})
test("conversion HTTP failure is permanent", async () => {
  await assert.rejects(
    renderApplicationLetter(
      { templateDoc: TEMPLATE_DOC, company: "PT A", position: "X", sendDate: new Date(), docxBuffer: FULL_TEMPLATE },
      gotenbergFetcher(422)
    ),
    (err) => err instanceof GotenbergConversionError && err.category === "permanent"
  )
})
test("multipart uses field 'files' with a filename ending in .docx", async () => {
  const seen = new Set<string>()
  const captureFetcher: typeof fetch = async (_input, init) => {
    const form = init?.body as FormData
    const file = form.get("files")
    assert.ok(file instanceof File, "form field 'files' must be a file")
    assert.ok(file.name.endsWith(".docx"), `multipart filename must end with .docx, got ${file.name}`)
    seen.add(file.name)
    return new Response(new Uint8Array(PDF_BYTES), {
      status: 200,
      headers: { "content-type": "application/pdf" },
    })
  }
  await convertDocxToPdf(FULL_TEMPLATE, "Template Lamaran", captureFetcher)
  await convertDocxToPdf(FULL_TEMPLATE, "Template Lamaran.docx", captureFetcher)
  await convertDocxToPdf(FULL_TEMPLATE, "Template.foo", captureFetcher)
  assert.deepEqual([...seen].sort(), ["Template Lamaran.docx", "Template.foo.docx"])
})
test("non-pdf response is permanent", async () => {
  await assert.rejects(
    renderApplicationLetter(
      { templateDoc: TEMPLATE_DOC, company: "PT A", position: "X", sendDate: new Date(), docxBuffer: FULL_TEMPLATE },
      gotenbergFetcher(200, Buffer.from("not a pdf at all"))
    ),
    (err) => err instanceof GotenbergConversionError && err.category === "permanent"
  )
})
test("invalid docx template fails before conversion (permanent)", async () => {
  let converted = false
  const spyFetcher: typeof fetch = async () => {
    converted = true
    return new Response(new Uint8Array(PDF_BYTES), { status: 200 })
  }
  await assert.rejects(
    renderApplicationLetter(
      { templateDoc: TEMPLATE_DOC, company: "PT A", position: "X", sendDate: new Date(), docxBuffer: Buffer.from("garbage") },
      spyFetcher
    ),
    (err) => err instanceof LetterTemplateError && err.category === "permanent"
  )
  assert.equal(converted, false, "conversion must not run on invalid template")
})

console.log("== letter: date formatting ==")
test("formatLetterDate renders Indonesian long format in the batch timezone", () => {
  assert.equal(formatLetterDate(new Date("2026-08-12T00:00:00.000Z"), "Asia/Jakarta"), "12 Agustus 2026")
  assert.equal(formatLetterDate(new Date("2030-01-01T00:00:00.000Z"), "Asia/Jakarta"), "1 Januari 2030")
})
test("formatLetterDate crosses midnight in the batch timezone", () => {
  assert.equal(formatLetterDate(new Date("2026-08-12T20:00:00.000Z"), "Asia/Jakarta"), "13 Agustus 2026")
})
test("formatLetterDate defaults to the env TIMEZONE", () => {
  process.env.TIMEZONE = "Asia/Jakarta"
  assert.equal(formatLetterDate(new Date("2026-08-12T20:00:00.000Z")), "13 Agustus 2026")
})

Promise.all(pending)
  .then(() => console.log(`\nAll ${passed} tests passed.`))
  .catch(() => {
    process.exitCode = 1
  })
