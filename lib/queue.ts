import { Queue, Worker } from "bullmq"
import { redis } from "@/lib/redis"

const QUEUE_NAME = process.env.BULL_QUEUE_NAME ?? "email-batch-queue"
const REPLY_QUEUE_NAME = process.env.BULL_REPLY_QUEUE_NAME ?? "reply-poll-queue"

export const emailQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: Number(process.env.BULL_MAX_RETRIES) ?? 3,
    backoff: {
      type: "exponential",
      delay: Number(process.env.BULL_DEFAULT_RETRY_DELAY) ?? 60000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})

export const replyQueue = new Queue(REPLY_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 30000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 20 },
  },
})

export function createEmailWorker(processor: (job: any) => Promise<void>) {
  return new Worker(QUEUE_NAME, processor, {
    connection: redis,
    concurrency: Number(process.env.BULL_CONCURRENCY) ?? 5,
  })
}

export function createReplyWorker(processor: (job: any) => Promise<void>) {
  return new Worker(REPLY_QUEUE_NAME, processor, {
    connection: redis,
    concurrency: 1,
  })
}
