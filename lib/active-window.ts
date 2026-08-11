export interface ActiveWindowFields {
  activeHoursStart: string | null
  activeHoursEnd: string | null
  activeDays: string | null
}

const DAY_INDEX: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
}

const DEFAULT_TIMEZONE = "Asia/Jakarta"

export function getWindowTimezone(): string {
  return process.env.TIMEZONE ?? DEFAULT_TIMEZONE
}

export function timeZoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts: Record<string, string> = {}
  for (const { type, value } of new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant)) {
    parts[type] = value
  }
  const local = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return Math.round((local - instant.getTime()) / 60000)
}

export function localWallClock(instant: Date, timeZone: string): Date {
  return new Date(instant.getTime() + timeZoneOffsetMinutes(instant, timeZone) * 60000)
}

export function wallClockToInstant(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  timeZone: string
): Date {
  const local = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0))
  const offset = timeZoneOffsetMinutes(local, timeZone)
  let instant = new Date(local.getTime() - offset * 60000)
  const refined = timeZoneOffsetMinutes(instant, timeZone)
  if (refined !== offset) {
    instant = new Date(local.getTime() - refined * 60000)
  }
  return instant
}

export function parseTimeMinutes(value: string | null | undefined): number | null {
  if (!value) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

export function parseActiveDays(value: string | null | undefined): Set<number> | null {
  if (!value) return null
  const parts = value
    .split(",")
    .map((part) => part.trim().toUpperCase())
    .filter((part) => part.length > 0)
  if (parts.length === 0) return null

  const days = new Set<number>()
  for (const part of parts) {
    if (/^\d$/.test(part)) {
      days.add(Number(part))
    } else if (part in DAY_INDEX) {
      days.add(DAY_INDEX[part])
    }
  }
  return days.size === 0 ? null : days
}

function isHoursWithin(mins: number, start: number, end: number): boolean {
  if (start <= end) return mins >= start && mins < end
  return mins >= start || mins < end
}

export function isWithinWindow(now: Date, batch: ActiveWindowFields): boolean {
  return isWithinWindowIn(now, batch, getWindowTimezone())
}

export function isWithinWindowIn(now: Date, batch: ActiveWindowFields, timeZone: string): boolean {
  const start = parseTimeMinutes(batch.activeHoursStart)
  const end = parseTimeMinutes(batch.activeHoursEnd)
  const days = parseActiveDays(batch.activeDays)

  const local = localWallClock(now, timeZone)
  const mins = local.getUTCHours() * 60 + local.getUTCMinutes()
  const dayOk = days === null || days.has(local.getUTCDay())
  const hoursOk = start === null || end === null || isHoursWithin(mins, start, end)
  return dayOk && hoursOk
}

export function nextWindowStart(now: Date, batch: ActiveWindowFields): Date {
  return nextWindowStartIn(now, batch, getWindowTimezone())
}

export function nextWindowStartIn(now: Date, batch: ActiveWindowFields, timeZone: string): Date {
  const start = parseTimeMinutes(batch.activeHoursStart)
  const end = parseTimeMinutes(batch.activeHoursEnd)
  const days = parseActiveDays(batch.activeDays)
  const effectiveStart = start ?? 0
  const local = localWallClock(now, timeZone)

  for (let offset = 0; offset < 8; offset++) {
    const candidateDay = (local.getUTCDay() + offset) % 7
    if (days !== null && !days.has(candidateDay)) continue

    if (end !== null && start !== null && start <= end && offset === 0) {
      const mins = local.getUTCHours() * 60 + local.getUTCMinutes()
      if (mins < start) {
        return wallClockToInstant(
          local.getUTCFullYear(),
          local.getUTCMonth() + 1,
          local.getUTCDate(),
          Math.floor(start / 60),
          start % 60,
          timeZone
        )
      }
    }

    const candidate = wallClockToInstant(
      local.getUTCFullYear(),
      local.getUTCMonth() + 1,
      local.getUTCDate() + offset,
      Math.floor(effectiveStart / 60),
      effectiveStart % 60,
      timeZone
    )
    if (candidate > now) return candidate
  }

  return new Date(now.getTime() + 24 * 60 * 60 * 1000)
}