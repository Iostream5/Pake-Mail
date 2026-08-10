function boolEnv(name: string, defaultValue = false): boolean {
  const val = process.env[name]
  if (val === undefined) return defaultValue
  return val.toLowerCase() === "true" || val === "1"
}

export const ENABLE_REPLY_WORKER = boolEnv("ENABLE_REPLY_WORKER", false)
export const ENABLE_RESEND_WORKERS = boolEnv("ENABLE_RESEND_WORKERS", false)
export const ENABLE_NOTIFICATION_BATCHER = boolEnv("ENABLE_NOTIFICATION_BATCHER", false)
