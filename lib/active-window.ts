const DAY_MAP: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 0
}

function parseActiveDays(activeDays: string | null | undefined): Set<number> | null {
  if (!activeDays) return null
  const parts = activeDays.split(",").map(s => s.trim().toUpperCase())
  const days = new Set<number>()
  for (const p of parts) {
    if (p in DAY_MAP) {
      days.add(DAY_MAP[p])
    }
  }
  return days.size > 0 ? days : null
}

function parseTime(timeStr: string | null | undefined): { hour: number; minute: number } | null {
  if (!timeStr) return null
  const parts = timeStr.split(":")
  if (parts.length < 2) return null
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (Number.isInteger(h) && Number.isInteger(m)) {
    return { hour: h, minute: m }
  }
  return null
}

export function isWithinWindow(
  now: Date,
  batch: { activeHoursStart?: string | null; activeHoursEnd?: string | null; activeDays?: string | null }
): boolean {
  // Check day first
  const allowedDays = parseActiveDays(batch.activeDays)
  if (allowedDays && !allowedDays.has(now.getDay())) {
    return false
  }

  // Check hours
  const start = parseTime(batch.activeHoursStart)
  const end = parseTime(batch.activeHoursEnd)
  if (start && end) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const startMinutes = start.hour * 60 + start.minute
    const endMinutes = end.hour * 60 + end.minute

    if (startMinutes <= endMinutes) {
      if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
        return false
      }
    } else {
      // Handles overnight ranges if any (e.g. 22:00 to 06:00)
      if (currentMinutes >= endMinutes && currentMinutes < startMinutes) {
        return false
      }
    }
  }

  return true
}

export function nextWindowStart(
  now: Date,
  batch: { activeHoursStart?: string | null; activeHoursEnd?: string | null; activeDays?: string | null }
): number {
  const start = parseTime(batch.activeHoursStart)

  const candidate = new Date(now.getTime())

  // If there's an activeHoursStart, let's align the candidate to that time first (or keep its time if there is none)
  if (start) {
    candidate.setHours(start.hour, start.minute, 0, 0)
  } else {
    candidate.setMinutes(candidate.getMinutes() + 1, 0, 0) // Just step by 1 minute
  }

  // We loop to find the first candidate date/time that is within the window and is in the future.
  for (let i = 0; i < 365; i++) { // limit loop to 1 year to avoid infinite loops
    if (candidate.getTime() > now.getTime() && isWithinWindow(candidate, batch)) {
      return candidate.getTime()
    }
    // If not, try advancing candidate.
    if (start) {
      // Advance by 1 day and reset to start hour/minute
      candidate.setDate(candidate.getDate() + 1)
      candidate.setHours(start.hour, start.minute, 0, 0)
    } else {
      // Just advance by 1 day
      candidate.setDate(candidate.getDate() + 1)
    }
  }

  return now.getTime() + 60000 // fallback
}
