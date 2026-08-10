import { test } from "node:test"
import assert from "node:assert"
import { numEnv } from "../lib/queue"

test("numEnv helper", () => {
  // Test unset
  delete process.env.TEST_VAR
  assert.strictEqual(numEnv("TEST_VAR", 42), 42)

  // Test valid parsed value
  process.env.TEST_VAR = "100"
  assert.strictEqual(numEnv("TEST_VAR", 42), 100)

  // Test invalid NaN value
  process.env.TEST_VAR = "not-a-number"
  assert.strictEqual(numEnv("TEST_VAR", 42), 42)

  // Test min clamp
  process.env.TEST_VAR = "5"
  assert.strictEqual(numEnv("TEST_VAR", 42, { min: 10 }), 10)

  // Test max clamp
  process.env.TEST_VAR = "50"
  assert.strictEqual(numEnv("TEST_VAR", 42, { max: 30 }), 30)

  // Test within range
  process.env.TEST_VAR = "20"
  assert.strictEqual(numEnv("TEST_VAR", 42, { min: 10, max: 30 }), 20)

  // Cleanup
  delete process.env.TEST_VAR
})
