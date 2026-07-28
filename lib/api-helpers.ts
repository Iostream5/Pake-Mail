import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function requireUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new AuthError()
  }
  return session.user.id
}

export class AuthError extends Error {
  constructor() {
    super("Unauthorized")
  }
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export async function handleApi(
  handler: () => Promise<NextResponse | Response>
): Promise<NextResponse | Response> {
  try {
    return await handler()
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError("Unauthorized", 401)
    }
    console.error(error)
    return apiError("Internal server error", 500)
  }
}
