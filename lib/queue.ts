import { Queue, Worker, type QueueOptions } from "bullmq"
import { redis } from "@/lib/redis"

const QUEUE_NAME = process.env.BULL_QUEUE_NAME ?? "email-batch-queue"
const REPLY_QUEUE_NAME = process.env.BULL_REPLY_QUEUE_NAME ?? "reply-poll-queue"
const RESEND_TRIGGER_QUEUE_NAME =
  process.env.BULL_RESEND_TRIGGER_QUEUE_NAME ?? "resend-trigger-queue"
const RESEND_EXECUTION_QUEUE_NAME =
  process.env.BULL_RESEND_EXECUTION_QUEUE_NAME ?? "resend-execution-queue"

const globalForQueue = globalThis as unknown as {
  __emailQueue?: Queue
  __replyQueue?: Queue
  __resendTriggerQueue?: Queue
  __resendExecutionQueue?: Queue
}

function getQueue(
  name: string,
  options: QueueOptions
): Queue {
  return new Queue(name, options)
}

function lazyQueue(
  key: keyof typeof globalForQueue,
  name: string,
  options: QueueOptions
): Queue {
  return new Proxy({} as Queue, {
    get(_target, prop) {
      const existing = globalForQueue[key]
      if (!existing) globalForQueue[key] = getQueue(name, options)
      const value = (globalForQueue[key] as unknown as Record<PropertyKey, unknown>)[prop]
      return typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(globalForQueue[key])
        : value
    },
    set(_target, prop, value) {
      const existing = globalForQueue[key]
      if (!existing) globalForQueue[key] = getQueue(name, options)
      ;(globalForQueue[key] as unknown as Record<PropertyKey, unknown>)[prop] = value
      return true
    },
  })
}

const baseOptions = {
  defaultJobOptions: {
    attempts: Number(process.env.BULL_MAX_RETRIES) ?? 3,
    backoff: {
      type: "exponential",
      delay: Number(process.env.BULL_DEFAULT_RETRY_DELAY) ?? 60000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
}

export const emailQueue = lazyQueue("__emailQueue", QUEUE_NAME, {
  connection: redis,
  ...baseOptions,
})

export const replyQueue = lazyQueue("__replyQueue", REPLY_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 30000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 20 },
  },
})

export const resendTriggerQueue = lazyQueue("__resendTriggerQueue", RESEND_TRIGGER_QUEUE_NAME, {
  connection: redis,
  ...baseOptions,
})

export const resendExecutionQueue = lazyQueue(
  "__resendExecutionQueue",
  RESEND_EXECUTION_QUEUE_NAME,
  {
    connection: redis,
    ...baseOptions,
  }
)

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

export function createResendTriggerWorker(processor: (job: any) => Promise<void>) {
  return new Worker(RESEND_TRIGGER_QUEUE_NAME, processor, {
    connection: redis,
    concurrency: 1,
  })
}

export function createResendExecutionWorker(processor: (job: any) => Promise<void>) {
  return new Worker(RESEND_EXECUTION_QUEUE_NAME, processor, {
    connection: redis,
    concurrency: 1,
  })
}
