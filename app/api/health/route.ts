import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"
import { NextResponse } from "next/server"

export async function GET() {
  const checks: Record<string, string> = {}

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = "ok"
  } catch {
    checks.database = "error"
  }

  try {
    await redis.ping()
    checks.redis = "ok"
  } catch {
    checks.redis = "error"
  }

  const allOk = Object.values(checks).every((s) => s === "ok")
  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", checks },
    { status: allOk ? 200 : 503 }
  )
}
