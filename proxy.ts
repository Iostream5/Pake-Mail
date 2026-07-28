export { auth as proxy } from "@/lib/auth-middleware"

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|register).*)"],
}
