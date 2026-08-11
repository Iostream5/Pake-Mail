import { convertDocxToPdf, GotenbergConversionError } from "@/lib/gotenberg"
import { renderDocxTemplate, formatLetterDate, type TemplateVariables } from "@/lib/document-template"
import { AttachmentError, asciiFilename, safeFilename } from "@/lib/attachments"
import { getSignedFileUrl } from "@/lib/storage"

export const LETTER_TEMPLATE_CATEGORY = "SURAT_LAMARAN"

export interface LetterTemplateDocument {
  id: string
  name: string
  fileUrl: string
  category: string
}

export function isDocxDocument(doc: { fileUrl: string; name: string }): boolean {
  return /\.docx$/i.test(doc.fileUrl) || /\.docx$/i.test(doc.name)
}

export function findLetterTemplate(
  documents: Array<{ id: string; category: string; fileUrl: string; name: string }>
): LetterTemplateDocument | null {
  return (
    documents.find(
      (doc) => doc.category === LETTER_TEMPLATE_CATEGORY && isDocxDocument(doc)
    ) ?? null
  )
}

export interface LetterRenderInput {
  templateDoc: LetterTemplateDocument
  company: string
  position: string
  sendDate: Date
  docxBuffer?: Buffer
}

export interface RenderedLetter {
  pdf: Buffer
  filename: string
}

export function letterAttachmentName(company: string): string {
  const base = safeFilename(`Lamaran - ${company}`)
  return `${asciiFilename(base)}.pdf`
}

export async function renderApplicationLetter(
  input: LetterRenderInput,
  fetcher: typeof fetch = fetch
): Promise<RenderedLetter> {
  const { templateDoc, company, position, sendDate, docxBuffer } = input

  let docx: Buffer
  if (docxBuffer) {
    docx = docxBuffer
  } else {
    try {
      const url = await getSignedFileUrl(templateDoc.fileUrl)
      const res = await fetcher(url)
      if (!res.ok) {
        throw new AttachmentError(
          `Gagal mengunduh template surat lamaran "${templateDoc.name}": server storage merespon HTTP ${res.status}`
        )
      }
      docx = Buffer.from(await res.arrayBuffer())
    } catch (err) {
      if (err instanceof AttachmentError) throw err
      throw new AttachmentError(
        `Gagal mengunduh template surat lamaran "${templateDoc.name}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  const variables: TemplateVariables = {
    company,
    position,
    date: formatLetterDate(sendDate),
  }

  const renderedDocx = renderDocxTemplate(docx, variables)
  const pdf = await convertDocxToPdf(renderedDocx, templateDoc.name, fetcher)

  const filename = letterAttachmentName(company)
  const isPdf = pdf.subarray(0, 5).toString("latin1") === "%PDF-"
  if (!isPdf) {
    throw new GotenbergConversionError(
      "Hasil konversi surat lamaran bukan file PDF yang valid"
    )
  }

  return { pdf, filename }
}
