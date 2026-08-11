export const GOTENBERG_CONVERT_PATH = "/forms/libreoffice/convert"
export const GOTENBERG_HEALTH_PATH = "/health"

export const GOTENBERG_TIMEOUT_MS = 60 * 1000
export const GOTENBERG_HEALTH_TIMEOUT_MS = 10 * 1000

export class GotenbergUnavailableError extends Error {
  readonly category = "temporary" as const
}

export class GotenbergConversionError extends Error {
  readonly category = "permanent" as const
}

export function gotenbergUrl(): string {
  const url = process.env.GOTENBERG_URL
  if (!url || url.trim() === "") {
    throw new GotenbergUnavailableError(
      "GOTENBERG_URL tidak dikonfigurasi, surat lamaran tidak dapat diproses"
    )
  }
  return url.trim().replace(/\/+$/, "")
}

export interface HealthCheckResult {
  ok: boolean
  status: string
  message?: string
}

export async function checkGotenbergHealth(): Promise<HealthCheckResult> {
  const base = gotenbergUrl()
  console.log("[Gotenberg] Health check started")
  try {
    const res = await fetch(`${base}${GOTENBERG_HEALTH_PATH}`, {
      signal: AbortSignal.timeout(GOTENBERG_HEALTH_TIMEOUT_MS),
    })
    if (!res.ok) {
      console.warn(`[Gotenberg] Health check failed: HTTP ${res.status}`)
      return { ok: false, status: `HTTP ${res.status}` }
    }
    console.log("[Gotenberg] Health check successful")
    return { ok: true, status: `HTTP ${res.status}` }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    console.warn(`[Gotenberg] Health check failed: ${reason}`)
    return { ok: false, status: "error", message: reason }
  }
}

export async function convertDocxToPdf(
  docxBuffer: Buffer,
  filename: string,
  fetcher: typeof fetch = fetch
): Promise<Buffer> {
  if (!Buffer.isBuffer(docxBuffer) || docxBuffer.byteLength === 0) {
    throw new GotenbergConversionError("Dokumen DOCX kosong atau tidak valid")
  }

  const base = gotenbergUrl()
  const uploadFilename = /\.docx$/i.test(filename) ? filename : `${filename}.docx`
  const form = new FormData()
  const blob = new Blob([new Uint8Array(docxBuffer)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  })
  form.append("files", blob, uploadFilename)

  let response: Response
  try {
    response = await fetcher(`${base}${GOTENBERG_CONVERT_PATH}`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(GOTENBERG_TIMEOUT_MS),
    })
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new GotenbergUnavailableError(
        `Konversi surat lamaran melewati batas waktu (${GOTENBERG_TIMEOUT_MS / 1000}s)`
      )
    }
    throw new GotenbergUnavailableError(
      `Layanan konversi surat lamaran tidak tersedia: ${reason}`
    )
  }

  if (!response.ok) {
    throw new GotenbergConversionError(
      `Konversi surat lamaran gagal (HTTP ${response.status})`
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  const pdf = Buffer.from(arrayBuffer)
  if (pdf.byteLength === 0) {
    throw new GotenbergConversionError("Hasil konversi surat lamaran kosong")
  }
  return pdf
}
