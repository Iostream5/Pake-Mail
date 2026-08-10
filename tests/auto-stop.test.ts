import { test } from "node:test"
import assert from "node:assert"

test("Auto-Stop gate and ratio logic pure-logic test", () => {
  // Test 1: below 10 processed sample gate -> auto-stop should NOT trip
  const sample1 = {
    sent: 1,
    failed: 5,
    threshold: 0.3
  }
  const processed1 = sample1.sent + sample1.failed
  const ratio1 = sample1.failed / processed1
  const trips1 = processed1 >= 10 && ratio1 >= sample1.threshold
  assert.strictEqual(trips1, false, "Should not trip because processed < 10")

  // Test 2: at/above 10 processed sample gate, below ratio -> auto-stop should NOT trip
  const sample2 = {
    sent: 8,
    failed: 2,
    threshold: 0.3
  }
  const processed2 = sample2.sent + sample2.failed
  const ratio2 = sample2.failed / processed2
  const trips2 = processed2 >= 10 && ratio2 >= sample2.threshold
  assert.strictEqual(trips2, false, "Should not trip because failure ratio (20%) < threshold (30%)")

  // Test 3: at/above 10 processed sample gate, at/above ratio -> auto-stop should trip
  const sample3 = {
    sent: 7,
    failed: 3,
    threshold: 0.3
  }
  const processed3 = sample3.sent + sample3.failed
  const ratio3 = sample3.failed / processed3
  const trips3 = processed3 >= 10 && ratio3 >= sample3.threshold
  assert.strictEqual(trips3, true, "Should trip because failure ratio (30%) >= threshold (30%)")
})
