import { createEmailWorker } from "@/lib/queue"
import { processEmailSend } from "./email-worker"

async function main() {
  const worker = createEmailWorker(async (job) => {
    console.log(`[Worker] JOB RECEIVED: ${job.id} — ${job.name}`)
    try {
      await processEmailSend(job.data)
      console.log(`[Worker] COMPLETED: ${job.id}`)
    } catch (err) {
      console.error(`[Worker] FAILED: ${job.id} —`, err instanceof Error ? err.message : err)
      throw err
    }
  })

  worker.on("completed", (job) => {
    console.log(`[Worker] ✅ ${job.id} done`)
  })

  worker.on("failed", (job, err) => {
    console.error(`[Worker] ❌ ${job?.id} failed: ${err.message}`)
  })

  worker.on("active", (job) => {
    console.log(`[Worker] ▶ Processing ${job.id}`)
  })

  console.log("[Worker] Email worker started, waiting for jobs...")

  const shutdown = async () => {
    console.log("[Worker] Shutting down...")
    await worker.close()
    process.exit(0)
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

main().catch((err) => {
  console.error("[Worker] Fatal error:", err)
  process.exit(1)
})
