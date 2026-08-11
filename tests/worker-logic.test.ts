import assert from "node:assert/strict"
import { isWithinWindow, nextWindowStart, parseActiveDays, parseTimeMinutes } from "@/lib/active-window"
import { numEnv } from "@/lib/queue"
import { computeAutoStopRatio } from "@/lib/batch-progress"

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

function date(y: number, m: number, d: number, h: number, min: number): Date {
  return new Date(y, m - 1, d, h, min, 0, 0)
}

const WEEKDAY_WINDOW = { activeHoursStart: "08:00", activeHoursEnd: "17:00", activeDays: "MON,TUE,WED,THU,FRI" }
const NUM_DAYS_WINDOW = { activeHoursStart: "08:00", activeHoursEnd: "17:00", activeDays: "1,2,3,4,5" }
const NO_RESTRICTION = { activeHoursStart: null, activeHoursEnd: null, activeDays: null }

console.log("== active-window: parse ==")
test("parseTimeMinutes valid", () => {
  assert.equal(parseTimeMinutes("08:00"), 480)
  assert.equal(parseTimeMinutes("23:59"), 1439)
  assert.equal(parseTimeMinutes("0:05"), 5)
})
test("parseTimeMinutes invalid/null", () => {
  assert.equal(parseTimeMinutes(null), null)
  assert.equal(parseTimeMinutes(undefined), null)
  assert.equal(parseTimeMinutes(""), null)
  assert.equal(parseTimeMinutes("25:00"), null)
  assert.equal(parseTimeMinutes("08:60"), null)
  assert.equal(parseTimeMinutes("garbage"), null)
})
test("parseActiveDays MON,TUE form", () => {
  const days = parseActiveDays("MON,TUE,WED,THU,FRI")
  assert.deepEqual([...days!].sort(), [1, 2, 3, 4, 5])
})
test("parseActiveDays numeric form", () => {
  const days = parseActiveDays("1,2,3,4,5")
  assert.deepEqual([...days!].sort(), [1, 2, 3, 4, 5])
})
test("parseActiveDays null/empty/garbage", () => {
  assert.equal(parseActiveDays(null), null)
  assert.equal(parseActiveDays(""), null)
  assert.equal(parseActiveDays(",,,"), null)
  assert.equal(parseActiveDays("FOO,BAR"), null)
})

console.log("== active-window: isWithinWindow ==")
test("inside window weekday", () => {
  assert.equal(isWithinWindow(date(2026, 8, 10, 10, 0), WEEKDAY_WINDOW), true)
})
test("outside hours before start", () => {
  assert.equal(isWithinWindow(date(2026, 8, 10, 6, 0), WEEKDAY_WINDOW), false)
})
test("outside hours after end", () => {
  assert.equal(isWithinWindow(date(2026, 8, 10, 18, 0), WEEKDAY_WINDOW), false)
})
test("weekend is outside", () => {
  assert.equal(isWithinWindow(date(2026, 8, 9, 10, 0), WEEKDAY_WINDOW), false)
})
test("numeric activeDays format behaves the same", () => {
  assert.equal(isWithinWindow(date(2026, 8, 10, 10, 0), NUM_DAYS_WINDOW), true)
  assert.equal(isWithinWindow(date(2026, 8, 9, 10, 0), NUM_DAYS_WINDOW), false)
})
test("null fields always allowed", () => {
  assert.equal(isWithinWindow(date(2026, 8, 9, 23, 0), NO_RESTRICTION), true)
})
test("boundary exact start is inside, exact end is outside", () => {
  assert.equal(isWithinWindow(date(2026, 8, 10, 8, 0), WEEKDAY_WINDOW), true)
  assert.equal(isWithinWindow(date(2026, 8, 10, 17, 0), WEEKDAY_WINDOW), false)
})
test("overnight window (22:00-06:00)", () => {
  const overnight = { activeHoursStart: "22:00", activeHoursEnd: "06:00", activeDays: null }
  assert.equal(isWithinWindow(date(2026, 8, 10, 23, 30), overnight), true)
  assert.equal(isWithinWindow(date(2026, 8, 11, 3, 0), overnight), true)
  assert.equal(isWithinWindow(date(2026, 8, 10, 12, 0), overnight), false)
})

console.log("== active-window: nextWindowStart ==")
test("same day before start", () => {
  const next = nextWindowStart(date(2026, 8, 10, 6, 0), WEEKDAY_WINDOW)
  assert.equal(next.getDay(), 1)
  assert.equal(next.getHours(), 8)
  assert.equal(next.getMinutes(), 0)
})
test("after end on Friday rolls over weekend to Monday", () => {
  const next = nextWindowStart(date(2026, 8, 14, 18, 0), WEEKDAY_WINDOW)
  assert.equal(next.getDay(), 1)
  assert.equal(next.getHours(), 8)
})
test("day-only restriction, wrong day", () => {
  const dayOnly = { activeHoursStart: null, activeHoursEnd: null, activeDays: "1,2,3,4,5" }
  const next = nextWindowStart(date(2026, 8, 9, 10, 0), dayOnly)
  assert.equal(next.getDay(), 1)
  assert.equal(next.getHours(), 0)
})
test("nextWindowStart always returns a future time", () => {
  const now = date(2026, 8, 10, 12, 0)
  assert.ok(nextWindowStart(now, WEEKDAY_WINDOW).getTime() > now.getTime())
})

console.log("== numEnv ==")
test("unset returns default", () => {
  delete process.env.TEST_NUM_ENV
  assert.equal(numEnv("TEST_NUM_ENV", 5), 5)
})
test("empty string returns default", () => {
  process.env.TEST_NUM_ENV = ""
  assert.equal(numEnv("TEST_NUM_ENV", 5), 5)
})
test("NaN returns default", () => {
  process.env.TEST_NUM_ENV = "abc"
  assert.equal(numEnv("TEST_NUM_ENV", 5), 5)
})
test("out-of-range (min) returns default", () => {
  process.env.TEST_NUM_ENV = "0"
  assert.equal(numEnv("TEST_NUM_ENV", 1, { min: 1 }), 1)
})
test("out-of-range (max) returns default", () => {
  process.env.TEST_NUM_ENV = "999"
  assert.equal(numEnv("TEST_NUM_ENV", 10, { max: 100 }), 10)
})
test("valid value parses", () => {
  process.env.TEST_NUM_ENV = "7"
  assert.equal(numEnv("TEST_NUM_ENV", 5), 7)
  assert.equal(numEnv("TEST_NUM_ENV", 1, { min: 1 }), 7)
})
test("float value parses", () => {
  process.env.TEST_NUM_ENV = "3.5"
  assert.equal(numEnv("TEST_NUM_ENV", 1), 3.5)
})

console.log("== auto-stop ratio ==")
test("1-of-1 failure below min sample gate", () => {
  assert.equal(computeAutoStopRatio({ SENT: 0, FAILED: 1 }, 0.3), false)
})
test("9 processed below min sample gate even with 100% failure", () => {
  assert.equal(computeAutoStopRatio({ SENT: 0, FAILED: 9 }, 0.3), false)
})
test("10 processed, ratio above threshold trips", () => {
  assert.equal(computeAutoStopRatio({ SENT: 6, FAILED: 4 }, 0.3), true)
})
test("10 processed, ratio below threshold does not trip", () => {
  assert.equal(computeAutoStopRatio({ SENT: 8, FAILED: 2 }, 0.3), false)
})
test("exactly at threshold does not trip (strict >)", () => {
  assert.equal(computeAutoStopRatio({ SENT: 7, FAILED: 3 }, 0.3), false)
})
test("zero threshold trips on any failure with enough sample", () => {
  assert.equal(computeAutoStopRatio({ SENT: 9, FAILED: 1 }, 0), true)
})
test("all sent never trips", () => {
  assert.equal(computeAutoStopRatio({ SENT: 50, FAILED: 0 }, 0.3), false)
})
test("custom min sample honored", () => {
  assert.equal(computeAutoStopRatio({ SENT: 0, FAILED: 1 }, 0.3, 1), true)
  assert.equal(computeAutoStopRatio({ SENT: 0, FAILED: 1 }, 0.3, 10), false)
})

console.log(`\nAll ${passed} tests passed.`)
