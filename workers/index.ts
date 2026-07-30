import { createEmailWorker, createReplyWorker } from "@/lib/queue"
import { processEmailSend } from "./email-worker"
import { processReplyPoll, scheduleNextPoll } from "./reply-worker"
import { notifBatchQueue, processNotificationBatch, scheduleNextBatch } from "./notification-batcher"
import { Worker } from "bullmq"
import { redis } from "@/lib/redis"

async function main() {
  const emailWorker = createEmailWorker(async (job) => {
    console.log(`[Worker] JOB RECEIVED: ${job.id} — ${job.name}`)
    try {
      await processEmailSend(job.data)
      console.log(`[Worker] COMPLETED: ${job.id}`)
    } catch (err) {
      console.error(`[Worker] FAILED: ${job.id} —`, err instanceof Error ? err.message : err)
      throw err
    }
  })

  emailWorker.on("completed", (job) => {
    console.log(`[Worker] ✅ ${job.id} done`)
  })

  emailWorker.on("failed", (job, err) => {
    console.error(`[Worker] ❌ ${job?.id} failed: ${err.message}`)
  })

  emailWorker.on("active", (job) => {
    console.log(`[Worker] ▶ Processing ${job.id}`)
  })

  const replyWorker = createReplyWorker(async (job) => {
    console.log(`[ReplyWorker] JOB RECEIVED: ${job.id} — ${job.name}`)
    try {
      await processReplyPoll()
      console.log(`[ReplyWorker] COMPLETED: ${job.id}`)
    } catch (err) {
      console.error(`[ReplyWorker] FAILED: ${job.id} —`, err instanceof Error ? err.message : err)
    }
  })

  replyWorker.on("completed", (job) => {
    console.log(`[ReplyWorker] ✅ ${job.id} done`)
  })

  replyWorker.on("failed", (job, err) => {
    console.error(`[ReplyWorker] ❌ ${job?.id} failed: ${err.message}`)
  })

  const notifBatcher = new Worker("notification-batch-queue", async (job) => {
    console.log(`[NotifBatcher] Processing batch...`)
    try {
      await processNotificationBatch()
      console.log(`[NotifBatcher] ✅ Done`)
    } catch (err) {
      console.error(`[NotifBatcher] ❌ Failed:`, err instanceof Error ? err.message : err)
    }
  }, { connection: redis, concurrency: 1 })

  await scheduleNextPoll()
  await scheduleNextBatch()

  console.log("[Worker] Email + Reply + Notification workers started, waiting for jobs...")

  const shutdown = async () => {
    console.log("[Worker] Shutting down...")
    await emailWorker.close()
    await replyWorker.close()
    await notifBatcher.close()
    process.exit(0)
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

main().catch((err) => {
  console.error("[Worker] Fatal error:", err)
  process.exit(1)
})
