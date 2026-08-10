import { test } from "node:test"
import assert from "node:assert"
import { attachmentCache } from "../lib/attachments"

test("attachments cache LRU eviction", () => {
  attachmentCache.clear()

  // Construct buffers
  const buf1 = Buffer.alloc(20 * 1024 * 1024) // 20MB
  const buf2 = Buffer.alloc(20 * 1024 * 1024) // 20MB
  const buf3 = Buffer.alloc(20 * 1024 * 1024) // 20MB

  attachmentCache.set("file1", buf1)
  assert.strictEqual(attachmentCache.getCacheSize(), 1)
  assert.strictEqual(attachmentCache.getTotalBytes(), 20 * 1024 * 1024)

  attachmentCache.set("file2", buf2)
  assert.strictEqual(attachmentCache.getCacheSize(), 2)
  assert.strictEqual(attachmentCache.getTotalBytes(), 40 * 1024 * 1024)

  // This third set should exceed the 50MB max limit of the cache, triggering LRU eviction of the oldest "file1"!
  attachmentCache.set("file3", buf3)
  assert.strictEqual(attachmentCache.getCacheSize(), 2)
  assert.strictEqual(attachmentCache.getTotalBytes(), 40 * 1024 * 1024)
  assert.strictEqual(attachmentCache.get("file1"), null, "file1 should be evicted")
  assert.ok(attachmentCache.get("file2") !== null, "file2 should still exist")
  assert.ok(attachmentCache.get("file3") !== null, "file3 should still exist")

  attachmentCache.clear()
  assert.strictEqual(attachmentCache.getCacheSize(), 0)
  assert.strictEqual(attachmentCache.getTotalBytes(), 0)
})
