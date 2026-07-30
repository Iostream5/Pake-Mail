import { pollAllUsers } from "@/lib/gmail-poll"
import { replyQueue } from "@/lib/queue"

const POLL_INTERVAL_MS = Number(process.env.REPLY_POLL_INTERVAL_MS) || 5 * 60 * 1000

export async function processReplyPoll() {
  console.log("[ReplyWorker] Starting poll cycle...")
  const start = Date.now()

  const result = await pollAllUsers()

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`[ReplyWorker] Poll complete: ${result.totalNewReplies} new replies from ${result.accountsChecked} accounts in ${elapsed}s`)

  return result
}

export async function scheduleNextPoll() {
  const jobs = await replyQueue.getRepeatableJobs()
  const existing = jobs.find((j) => j.name === "reply-poll")

  if (!existing) {
    await replyQueue.upsertJobScheduler(
      "reply-poll",
      { every: POLL_INTERVAL_MS },
      { name: "reply-poll", data: {} }
    )
    console.log(`[ReplyWorker] Scheduled poll every ${POLL_INTERVAL_MS / 1000}s`)
  }
}
