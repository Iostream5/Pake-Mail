"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Icon } from "@/components/ui/icon"
import { MonoLabel } from "@/components/ui/mono-label"
import { StatusPulse } from "@/components/ui/status-pulse"
import { AuthShell } from "@/components/auth/auth-shell"

export function RegisterForm() {
  const [loading, setLoading] = useState(false)

  const handleGoogle = async () => {
    setLoading(true)
    await signIn("google", { redirectTo: "/dashboard" })
  }

  return (
<AuthShell mode="register">
      {/* Heading */}
      <div className="mb-8">
        <h2 className="font-[family-name:var(--font-geist-sans)] text-2xl font-bold uppercase tracking-tight text-bone">
          Buat Akun Baru
        </h2>
        <p className="mt-2 font-[family-name:var(--font-geist-sans)] text-sm leading-relaxed text-warm-granite">
          Daftar dengan Gmail Google. Hanya butuh satu langkah untuk bergabung sebagai
          operator sistem pengiriman lamaran massal.
        </p>
      </div>

      {/* Google Sign In */}
      <button
        type="button"
        disabled={loading}
        onClick={handleGoogle}
        className="group relative flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-[6px] border border-ash-stroke bg-obsidian-canvas transition-all duration-200 hover:border-bone active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-bone/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" aria-hidden="true" />
        <svg className={loading ? "h-5 w-5 animate-status-pulse" : "h-5 w-5"} viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        <span className="relative font-[family-name:var(--font-geist-mono)] text-xs font-bold uppercase tracking-widest text-bone">
          {loading ? "REGISTERING..." : "Daftar dengan Google"}
        </span>
      </button>

      {/* Status + divider */}
      <div className="mt-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-ash-stroke/40" aria-hidden="true" />
        <StatusPulse color="green" label="SECURE CONNECTION" />
        <span className="h-px flex-1 bg-ash-stroke/40" aria-hidden="true" />
      </div>

      {/* Footer meta */}
      <div className="mt-6 rounded-[6px] border border-ash-stroke bg-obsidian-canvas/60 p-4">
        <p className="text-center font-[family-name:var(--font-geist-sans)] text-xs leading-relaxed text-warm-granite">
          Dengan mendaftar, Anda menyetujui{" "}
          <span className="text-bone">Ketentuan Layanan</span> dan{" "}
          <span className="text-bone">Kebijakan Privasi</span> kami.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Icon name="verified_user" size="sm" className="text-metric-green" />
          <MonoLabel color="warm-granite" className="text-[9px]">
            DATA PROTECTED · NO SELLING TO THIRD PARTIES
          </MonoLabel>
        </div>
      </div>

      {/* Switch to login */}
      <div className="mt-6 flex items-center justify-center gap-2">
        <MonoLabel color="warm-granite" size="sm">
          SUDAH PUNYA AKUN?
        </MonoLabel>
        <Link
          href="/login"
          className="font-[family-name:var(--font-geist-mono)] text-xs font-bold uppercase tracking-widest text-bone underline underline-offset-4 transition-colors hover:text-signal-orange"
        >
          Masuk
        </Link>
      </div>
    </AuthShell>
  )
}