"use client"

import { signIn } from "next-auth/react"
import { Icon } from "@/components/ui/icon"
import { MonoLabel } from "@/components/ui/mono-label"
import { StatusPulse } from "@/components/ui/status-pulse"
import Link from "next/link"

export function LoginForm() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-obsidian-canvas px-4 relative">
      {/* ─── Brand Header ─── */}
      <header className="mb-16 text-center">
        <div className="mb-6 inline-flex items-center gap-2">
          <StatusPulse color="orange" />
          <MonoLabel>System Operational</MonoLabel>
        </div>
        <h1 className="font-[family-name:var(--font-geist-sans)] text-3xl md:text-[44px] text-bone tracking-tighter uppercase leading-tight">
          Pake Mail
        </h1>
      </header>

      {/* ─── Login Card (Bone) ─── */}
      <section className="w-full max-w-[440px] rounded-[20px] border border-ash-stroke bg-bone p-10 shadow-2xl overflow-hidden relative">
        {/* Decorative top stroke */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-warm-granite to-transparent opacity-20" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Heading */}
          <h2 className="font-[family-name:var(--font-geist-sans)] text-3xl text-ink-black mb-16 text-center leading-tight tracking-tight">
            Masuk ke Pake Mail
          </h2>

          {/* Google Sign In Button */}
          <button
            onClick={() => signIn("google", { redirectTo: "/dashboard" })}
            className="group w-full border border-ash-stroke/30 bg-chalk hover:bg-white text-ink-black px-6 h-14 rounded-lg flex items-center justify-center gap-4 transition-all duration-200 active:scale-[0.98] focus:ring-2 focus:ring-ink-black focus:outline-none"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span className="font-bold tracking-tight">Sign in with Google</span>
          </button>

          {/* Technical metadata */}
          <div className="mt-10 w-full border-t border-ash-stroke/10 pt-8">
            <div className="flex items-center justify-between text-ink-black/40">
              <MonoLabel color="ink-black" className="opacity-40">
                VERSION_2.4.0
              </MonoLabel>
              <div className="flex items-center gap-3">
                <Icon name="encrypted" size="sm" className="text-ink-black/40" />
                <MonoLabel color="ink-black" className="opacity-40">
                  End-to-End Secure
                </MonoLabel>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 mt-auto px-8 py-10 w-full flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="max-w-md text-center md:text-left">
          <p className="text-sm text-warm-granite leading-relaxed">
            © 2024 Pake Mail. All systems active. Access restricted to authorized personnel. Use of
            this platform is subject to our{" "}
            <Link href="#" className="text-bone hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="#" className="text-bone hover:underline">
              Security Protocols
            </Link>
            .
          </p>
        </div>
        <div className="flex gap-8">
          {["Privacy", "Help", "Status"].map((link) => (
            <Link
              key={link}
              href="#"
              className="font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-widest text-warm-granite hover:text-bone transition-colors"
            >
              {link}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  )
}
