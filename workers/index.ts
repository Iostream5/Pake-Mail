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
      await processEmailSend(job.data, job.attemptsMade)
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

  const notifBatcher = new Worker("notification-batch-queue", async (job) => {
    console.log(`[NotifBatcher] Processing batch...`)
    try {
      await processNotificationBatch()
      console.log(`[NotifBatcher] ✅ Done`)
    } catch (err) {
      console.error(`[NotifBatcher] ❌ Failed:`, err instanceof Error ? err.message : err)
    }
  }, { connection: redis, concurrency: 1 })

  let replyWorker: any = null
  let resendTriggerWorker: any = null
  let resendExecutionWorker: any = null

  const enableFutureWorkers = process.env.ENABLE_FUTURE_WORKERS === "true"

  if (enableFutureWorkers) {
    replyWorker = createReplyWorker(async (job) => {
      console.log(`[ReplyWorker] JOB RECEIVED: ${job.id} — ${job.name}`)
      try {
        await processReplyPoll()
        console.log(`[ReplyWorker] COMPLETED: ${job.id}`)
      } catch (err) {
        console.error(`[ReplyWorker] FAILED: ${job.id} —`, err instanceof Error ? err.message : err)
      }
    })

    replyWorker.on("completed", (job: any) => {
      console.log(`[ReplyWorker] ✅ ${job.id} done`)
    })

    replyWorker.on("failed", (job: any, err: any) => {
      console.error(`[ReplyWorker] ❌ ${job?.id} failed: ${err.message}`)
    })

    resendTriggerWorker = createResendTriggerWorker(async (job) => {
      console.log(`[ResendTrigger] JOB RECEIVED: ${job.id} — ${job.name}`)
      try {
        await processResendTrigger()
        console.log(`[ResendTrigger] COMPLETED: ${job.id}`)
      } catch (err) {
        console.error(`[ResendTrigger] FAILED: ${job.id} —`, err instanceof Error ? err.message : err)
      }
    })

    resendTriggerWorker.on("completed", (job: any) => {
      console.log(`[ResendTrigger] ✅ ${job.id} done`)
    })
    resendTriggerWorker.on("failed", (job: any, err: any) => {
      console.error(`[ResendTrigger] ❌ ${job?.id} failed: ${err.message}`)
    })

    resendExecutionWorker = createResendExecutionWorker(async (job) => {
      console.log(`[ResendExec] JOB RECEIVED: ${job.id} — ${job.name}`)
      try {
        await processResendExecution()
        console.log(`[ResendExec] COMPLETED: ${job.id}`)
      } catch (err) {
        console.error(`[ResendExec] FAILED: ${job.id} —`, err instanceof Error ? err.message : err)
      }
    })

    resendExecutionWorker.on("completed", (job: any) => {
      console.log(`[ResendExec] ✅ ${job.id} done`)
    })
    resendExecutionWorker.on("failed", (job: any, err: any) => {
      console.error(`[ResendExec] ❌ ${job?.id} failed: ${err.message}`)
    })

    await scheduleNextPoll()
    await scheduleNextResendTrigger()
    await scheduleNextResendExecution()
  }

  await scheduleNextBatch()

  if (enableFutureWorkers) {
    console.log("[Worker] Email + Reply + Notification + ResendTrigger + ResendExecution workers started, waiting for jobs...")
  } else {
    console.log("[Worker] Email + Notification workers started (future workers disabled), waiting for jobs...")
  }

  const shutdown = async () => {
    console.log("[Worker] Shutting down...")
    await emailWorker.close()
    await notifBatcher.close()
    if (replyWorker) await replyWorker.close()
    if (resendTriggerWorker) await resendTriggerWorker.close()
    if (resendExecutionWorker) await resendExecutionWorker.close()
    process.exit(0)
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

main().catch((err) => {
  console.error("[Worker] Fatal error:", err)
  process.exit(1)
})
