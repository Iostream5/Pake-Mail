import { Redis } from "ioredis"

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

let client: Redis | undefined

function getClient(): Redis {
  if (!client) {
    const url = process.env.REDIS_URL
    if (!url) {
      throw new Error(
        "REDIS_URL is not set. Set it (or its runtime value) before using Redis. " +
          "Note: it is not available during `next build`, so Redis is initialized lazily at runtime."
      )
    }
    client = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: url.startsWith("rediss://") ? {} : undefined,
    })
  }
  return client
}

export const redis: Redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const real = getClient()
    const value = (real as unknown as Record<PropertyKey, unknown>)[prop]
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : value
  },
})

if (process.env.NODE_ENV !== "production") globalForRedis.redis = client