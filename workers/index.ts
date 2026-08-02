import { createEmailWorker, createReplyWorker, createResendTriggerWorker, createResendExecutionWorker } from "@/lib/queue"
import { processEmailSend } from "./email-worker"
import { processReplyPoll, scheduleNextPoll } from "./reply-worker"
import { notifBatchQueue, processNotificationBatch, scheduleNextBatch } from "./notification-batcher"
import { processResendTrigger, scheduleNextResendTrigger } from "./resend-trigger-worker"
import { processResendExecution, scheduleNextResendExecution } from "./resend-execution-worker"
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

  const resendTriggerWorker = createResendTriggerWorker(async (job) => {
    console.log(`[ResendTrigger] JOB RECEIVED: ${job.id} — ${job.name}`)
    try {
      await processResendTrigger()
      console.log(`[ResendTrigger] COMPLETED: ${job.id}`)
    } catch (err) {
      console.error(`[ResendTrigger] FAILED: ${job.id} —`, err instanceof Error ? err.message : err)
    }
  })

  resendTriggerWorker.on("completed", (job) => {
    console.log(`[ResendTrigger] ✅ ${job.id} done`)
  })
  resendTriggerWorker.on("failed", (job, err) => {
    console.error(`[ResendTrigger] ❌ ${job?.id} failed: ${err.message}`)
  })

  const resendExecutionWorker = createResendExecutionWorker(async (job) => {
    console.log(`[ResendExec] JOB RECEIVED: ${job.id} — ${job.name}`)
    try {
      await processResendExecution()
      console.log(`[ResendExec] COMPLETED: ${job.id}`)
    } catch (err) {
      console.error(`[ResendExec] FAILED: ${job.id} —`, err instanceof Error ? err.message : err)
    }
  })

  resendExecutionWorker.on("completed", (job) => {
    console.log(`[ResendExec] ✅ ${job.id} done`)
  })
  resendExecutionWorker.on("failed", (job, err) => {
    console.error(`[ResendExec] ❌ ${job?.id} failed: ${err.message}`)
  })

  await scheduleNextPoll()
  await scheduleNextBatch()
  await scheduleNextResendTrigger()
  await scheduleNextResendExecution()

  console.log("[Worker] Email + Reply + Notification + ResendTrigger + ResendExecution workers started, waiting for jobs...")

  const shutdown = async () => {
    console.log("[Worker] Shutting down...")
    await emailWorker.close()
    await replyWorker.close()
    await notifBatcher.close()
    await resendTriggerWorker.close()
    await resendExecutionWorker.close()
    process.exit(0)
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

main().catch((err) => {
  console.error("[Worker] Fatal error:", err)
  process.exit(1)
})
