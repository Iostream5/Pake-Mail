import PizZip from "pizzip"
import Docxtemplater from "docxtemplater"
import { getWindowTimezone } from "@/lib/active-window"

export const SUPPORTED_VARIABLES = ["company", "position", "date"] as const
export type TemplateVariable = (typeof SUPPORTED_VARIABLES)[number]

export interface TemplateVariables {
  company: string
  position: string
  date: string
}

export class LetterTemplateError extends Error {
  readonly category = "permanent" as const
}

const INDONESIAN_MONTHS: Record<string, string> = {
  January: "Januari",
  February: "Februari",
  March: "Maret",
  April: "April",
  May: "Mei",
  June: "Juni",
  July: "Juli",
  August: "Agustus",
  September: "September",
  October: "Oktober",
  November: "November",
  December: "Desember",
}

export function formatLetterDate(date: Date, timeZone: string = getWindowTimezone()): string {
  const parts: Record<string, string> = {}
  for (const { type, value } of new Intl.DateTimeFormat("en-US", {
    timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(date)) {
    parts[type] = value
  }
  const month = INDONESIAN_MONTHS[parts.month] ?? parts.month
  return `${parts.day} ${month} ${parts.year}`
}

export function renderDocxTemplate(buffer: Buffer, variables: TemplateVariables): Buffer {
  if (!Buffer.isBuffer(buffer) || buffer.byteLength === 0) {
    throw new LetterTemplateError("Dokumen template surat lamaran kosong atau tidak valid")
  }

  let zip: PizZip
  try {
    zip = new PizZip(buffer)
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new LetterTemplateError(`Template surat lamaran bukan DOCX yang valid: ${reason}`)
  }

  let doc: Docxtemplater
  try {
    doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{{", end: "}}" },
      nullGetter: (part) => {
        throw new Error(
          `Template contains unresolved variable: {{${part.value ?? "unknown"}}}`
        )
      },
    })
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new LetterTemplateError(`Gagal membaca template surat lamaran: ${reason}`)
  }

  try {
    doc.render(variables)
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new LetterTemplateError(
      `Gagal merender template surat lamaran: ${reason}`
    )
  }

  return Buffer.from(doc.getZip().generate({ type: "nodebuffer" }))
}
