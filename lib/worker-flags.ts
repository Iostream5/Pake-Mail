export function boolEnv(name: string, defaultValue = false): boolean {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === "") return defaultValue

  const normalized = raw.trim().toLowerCase()
  if (["1", "true", "yes", "on"].includes(normalized)) return true
  if (["0", "false", "no", "off"].includes(normalized)) return false
  return defaultValue
}

export const ENABLE_REPLY_WORKER = boolEnv("ENABLE_REPLY_WORKER")
export const ENABLE_RESEND_WORKERS = boolEnv("ENABLE_RESEND_WORKERS")
export const ENABLE_NOTIFICATION_BATCHER = boolEnv("ENABLE_NOTIFICATION_BATCHER")
