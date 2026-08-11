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

function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
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

function timeOnDate(date: Date, minutes: number): Date {
  const result = new Date(date)
  result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return result
}

export function isWithinWindow(now: Date, batch: ActiveWindowFields): boolean {
  const start = parseTimeMinutes(batch.activeHoursStart)
  const end = parseTimeMinutes(batch.activeHoursEnd)
  const days = parseActiveDays(batch.activeDays)

  const mins = minutesFromMidnight(now)
  const dayOk = days === null || days.has(now.getDay())
  const hoursOk = start === null || end === null || isHoursWithin(mins, start, end)
  return dayOk && hoursOk
}

export function nextWindowStart(now: Date, batch: ActiveWindowFields): Date {
  const start = parseTimeMinutes(batch.activeHoursStart)
  const end = parseTimeMinutes(batch.activeHoursEnd)
  const days = parseActiveDays(batch.activeDays)
  const effectiveStart = start ?? 0

  for (let offset = 0; offset < 8; offset++) {
    const candidateDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
    if (days !== null && !days.has(candidateDay.getDay())) continue

    if (end !== null && start !== null && start <= end && offset === 0) {
      const mins = minutesFromMidnight(now)
      if (mins < start) return timeOnDate(now, effectiveStart)
    }

    const candidate = timeOnDate(candidateDay, effectiveStart)
    if (candidate > now) return candidate
  }

  return new Date(now.getTime() + 24 * 60 * 60 * 1000)
}
