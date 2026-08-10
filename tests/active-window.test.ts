import { test } from "node:test"
import assert from "node:assert"
import { isWithinWindow, nextWindowStart } from "../lib/active-window"

test("active-window helper", () => {
  // Monday 10:00 AM
  const mondayIn = new Date("2026-03-02T10:00:00") // Monday
  // Saturday 10:00 AM
  const saturdayIn = new Date("2026-03-07T10:00:00") // Saturday
  // Monday 18:00 PM
  const mondayOut = new Date("2026-03-02T18:00:00") // Monday night

  const batchStringDays = {
    activeHoursStart: "08:00",
    activeHoursEnd: "17:00",
    activeDays: "MON,TUE,WED,THU,FRI",
  }

  const batchDigitDays = {
    activeHoursStart: "08:00",
    activeHoursEnd: "17:00",
    activeDays: "1,2,3,4,5",
  }

  const batchNullFields = {
    activeHoursStart: null,
    activeHoursEnd: null,
    activeDays: null,
  }

  // 1. isWithinWindow tests
  assert.strictEqual(isWithinWindow(mondayIn, batchStringDays), true, "Monday 10am is within weekdays")
  assert.strictEqual(isWithinWindow(saturdayIn, batchStringDays), false, "Saturday is not within weekdays")
  assert.strictEqual(isWithinWindow(mondayOut, batchStringDays), false, "Monday 6pm is outside active hours")

  assert.strictEqual(isWithinWindow(mondayIn, batchDigitDays), true, "Monday 10am is within digit-format weekdays")
  assert.strictEqual(isWithinWindow(saturdayIn, batchDigitDays), false, "Saturday is not within digit-format weekdays")

  assert.strictEqual(isWithinWindow(saturdayIn, batchNullFields), true, "Null fields always allowed")

  // 2. nextWindowStart tests
  const nextStartFromMondayNight = nextWindowStart(mondayOut, batchStringDays)
  const expectedTuesdayStart = new Date("2026-03-03T08:00:00").getTime()
  assert.strictEqual(nextStartFromMondayNight, expectedTuesdayStart, "Rollover Monday night to Tuesday morning")

  const nextStartFromSaturday = nextWindowStart(saturdayIn, batchStringDays)
  const expectedMondayStart = new Date("2026-03-09T08:00:00").getTime()
  assert.strictEqual(nextStartFromSaturday, expectedMondayStart, "Rollover Saturday to Monday morning")
})
