import { Worker, DelayedError } from "bullmq"
import { redis } from "@/lib/redis"
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
import {
  ENABLE_NOTIFICATION_BATCHER,
  ENABLE_REPLY_WORKER,
  ENABLE_RESEND_WORKERS,
} from "@/lib/worker-flags"

async function removeScheduler(queue: { removeJobScheduler: (id: string) => Promise<boolean> }, id: string) {
  try {
    await queue.removeJobScheduler(id)
    console.log(`[Worker] Removed scheduler: ${id}`)
  } catch (err) {
    console.log(`[Worker] No scheduler ${id} to remove:`, err instanceof Error ? err.message : err)
  }
}

async function main() {
  const emailWorker = createEmailWorker(async (job) => {
    console.log(`[Worker] JOB RECEIVED: ${job.id} — ${job.name}`)
    const outcome = await processEmailSend(job.data, {
      attemptsMade: job.attemptsMade,
      totalAttempts: job.opts.attempts ?? 1,
    })

    switch (outcome.type) {
      case "delayed": {
        const when = Math.max(outcome.delayUntil.getTime(), Date.now() + 1000)
        await job.moveToDelayed(when)
        console.log(`[Worker] DELAYED until ${new Date(when).toISOString()}: ${job.id}`)
        throw new DelayedError()
      }
      case "retry":
        console.warn(`[Worker] RETRY scheduled: ${job.id} — ${outcome.error.message}`)
        throw outcome.error
      case "failed":
        console.error(`[Worker] FAILED: ${job.id} — ${outcome.error.message}`)
        throw outcome.error
      default:
        console.log(`[Worker] COMPLETED: ${job.id}`)
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

  const startedWorkers: Worker[] = []

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
    startedWorkers.push(replyWorker)
  } else {
    await removeScheduler(replyQueue, "reply-poll")
  }

  if (ENABLE_NOTIFICATION_BATCHER) {
    const { processNotificationBatch, scheduleNextBatch } = await import("./notification-batcher")
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
    startedWorkers.push(notifBatcher)
  } else {
    const { notifBatchQueue } = await import("./notification-batcher")
    await removeScheduler(notifBatchQueue, "notification-batch")
  }

  if (ENABLE_RESEND_WORKERS) {
    const { processResendTrigger, scheduleNextResendTrigger } = await import("./resend-trigger-worker")
    const { processResendExecution, scheduleNextResendExecution } = await import("./resend-execution-worker")

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
    startedWorkers.push(resendTriggerWorker, resendExecutionWorker)
  } else {
    await removeScheduler(resendTriggerQueue, "resend-trigger")
    await removeScheduler(resendExecutionQueue, "resend-execution")
  }

  console.log(
    `[Worker] Email worker started (reply=${ENABLE_REPLY_WORKER}, resend=${ENABLE_RESEND_WORKERS}, notif=${ENABLE_NOTIFICATION_BATCHER}), waiting for jobs...`
  )

  const shutdown = async () => {
    console.log("[Worker] Shutting down...")
    await emailWorker.close()
    for (const worker of startedWorkers) {
      await worker.close()
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
