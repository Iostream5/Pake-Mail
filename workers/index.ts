import {
  createEmailWorker,
  createReplyWorker,
  createResendTriggerWorker,
  createResendExecutionWorker,
  replyQueue,
  resendTriggerQueue,
  resendExecutionQueue,
} from "@/lib/queue"
import { processEmailSend } from "./email-worker"
import { Worker } from "bullmq"
import { redis } from "@/lib/redis"
import {
  ENABLE_REPLY_WORKER,
  ENABLE_RESEND_WORKERS,
  ENABLE_NOTIFICATION_BATCHER,
} from "@/lib/worker-flags"

async function main() {
  const activeWorkers: Worker[] = []

  const emailWorker = createEmailWorker(async (job, token) => {
    console.log(`[Worker] JOB RECEIVED: ${job.id} — ${job.name}`)
    try {
      await processEmailSend(job, token)
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

  // Reply Worker Section
  if (ENABLE_REPLY_WORKER) {
    const { processReplyPoll, scheduleNextPoll } = await import("./reply-worker")
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

    await scheduleNextPoll()
    activeWorkers.push(replyWorker)
  } else {
    try {
      await replyQueue.removeJobScheduler("reply-poll")
      console.log("[Worker] Cleaned up reply-poll job scheduler (disabled)")
    } catch {
      // no-op
    }
  }

  // Notification Batcher Section
  if (ENABLE_NOTIFICATION_BATCHER) {
    const { processNotificationBatch, scheduleNextBatch } = await import(
      "./notification-batcher"
    )
    const notifBatcher = new Worker(
      "notification-batch-queue",
      async () => {
        console.log(`[NotifBatcher] Processing batch...`)
        try {
          await processNotificationBatch()
          console.log(`[NotifBatcher] ✅ Done`)
        } catch (err) {
          console.error(`[NotifBatcher] ❌ Failed:`, err instanceof Error ? err.message : err)
        }
      },
      { connection: redis, concurrency: 1 }
    )

    await scheduleNextBatch()
    activeWorkers.push(notifBatcher)
  } else {
    try {
      const { notifBatchQueue } = await import("./notification-batcher")
      await notifBatchQueue.removeJobScheduler("notification-batch")
      await notifBatchQueue.close()
      console.log("[Worker] Cleaned up notification-batch job scheduler (disabled)")
    } catch {
      // no-op
    }
  }

  // Resend Workers Section
  if (ENABLE_RESEND_WORKERS) {
    const { processResendTrigger, scheduleNextResendTrigger } = await import(
      "./resend-trigger-worker"
    )
    const { processResendExecution, scheduleNextResendExecution } = await import(
      "./resend-execution-worker"
    )

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

    await scheduleNextResendTrigger()
    await scheduleNextResendExecution()

    activeWorkers.push(resendTriggerWorker)
    activeWorkers.push(resendExecutionWorker)
  } else {
    try {
      await resendTriggerQueue.removeJobScheduler("resend-trigger")
      console.log("[Worker] Cleaned up resend-trigger job scheduler (disabled)")
    } catch {
      // no-op
    }
    try {
      await resendExecutionQueue.removeJobScheduler("resend-execution")
      console.log("[Worker] Cleaned up resend-execution job scheduler (disabled)")
    } catch {
      // no-op
    }
  }

  console.log("[Worker] Email worker started (non-core workers enabled based on flags), waiting for jobs...")

  const shutdown = async () => {
    console.log("[Worker] Shutting down...")
    await emailWorker.close()
    for (const w of activeWorkers) {
      await w.close()
    }
    process.exit(0)
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

main().catch((err) => {
  console.error("[Worker] Fatal error:", err)
  process.exit(1)
})
