"use client"

import { useState } from "react"
import Link from "next/link"
import { MonoLabel } from "@/components/ui/mono-label"
import { DocModal, type DocContent } from "@/components/landing/doc-modal"
import { FOOTER_DOCS } from "@/components/landing/docs-content"

interface AuthShellProps {
  children: React.ReactNode
  mode: "login" | "register"
}

const copy = {
  login: {
    tagline: "JOB APPLICATION BATCH SYSTEM",
    url: "app.pakemail.io/auth",
  },
  register: {
    tagline: "OPERATOR ONBOARDING",
    url: "app.pakemail.io/auth/register",
  },
}

export function AuthShell({ children, mode }: AuthShellProps) {
  const c = copy[mode]
  const [openDoc, setOpenDoc] = useState<DocContent | null>(null)

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-obsidian-canvas text-bone selection:bg-bone selection:text-obsidian-canvas isolate">
      {/* ─── Animated background (living system) ─── */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 520px at 18% -5%, rgba(238,96,24,0.10), transparent 60%), radial-gradient(700px 460px at 90% 25%, rgba(160,202,146,0.07), transparent 55%)",
          }}
        />
        <div className="terminal-grid absolute inset-0" aria-hidden="true" />
        <div
          className="conic-glow absolute left-1/2 top-[-45%] h-[80vmax] w-[80vmax] -translate-x-1/2 rounded-full opacity-[0.07] blur-3xl"
          style={{
            background:
              "conic-gradient(from 0deg, transparent, var(--color-signal-orange), transparent 40%)",
          }}
        />
        <div className="scan-line absolute inset-x-0 h-1/2" aria-hidden="true" />
        <div
          className="absolute inset-x-0 bottom-0 h-28"
          style={{
            background: "linear-gradient(to bottom, transparent, var(--color-obsidian-canvas))",
          }}
        />
      </div>

      {/* ─── Brand Header ─── */}
      <header className="relative z-10 flex flex-col items-center px-6 pb-8 pt-14 text-center md:pt-16">
<Link href="/" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Pake Mail"
            className="h-11 w-12 flex-shrink-0 object-contain"
          />
          <span className="font-[family-name:var(--font-geist-sans)] text-3xl font-black uppercase tracking-tighter text-bone md:text-4xl">
            Pake Mail
          </span>
        </Link>

        <MonoLabel className="mt-3 text-[9px]" color="warm-granite">{c.tagline}</MonoLabel>
      </header>

      {/* ─── Auth Card (dark terminal) ─── */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[440px] relative overflow-hidden rounded-xl border border-ash-stroke bg-carbon-lift shadow-2xl">
          {/* Header bar */}
          <div className="flex items-center justify-between border-b border-ash-stroke bg-obsidian-canvas/60 px-5 py-3">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-error-container" />
              <span className="h-3 w-3 rounded-full bg-signal-orange" />
              <span className="h-3 w-3 rounded-full bg-metric-green" />
            </div>
            <MonoLabel color="warm-granite" className="hidden sm:inline">
              {c.url}
            </MonoLabel>
          </div>

          {/* Body */}
          <div className="p-7 md:p-9">{children}</div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-ash-stroke/30 px-6 py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-center font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-widest text-warm-granite md:text-left">
            © 2026 Pake Mail.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => setOpenDoc(FOOTER_DOCS.privacy)}
              className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-widest text-warm-granite transition-colors hover:text-bone"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => setOpenDoc(FOOTER_DOCS.terms)}
              className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-widest text-warm-granite transition-colors hover:text-bone"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => setOpenDoc(FOOTER_DOCS.security)}
              className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-widest text-warm-granite transition-colors hover:text-bone"
            >
              Security
            </button>
          </div>
        </div>
      </footer>

      <DocModal
        open={openDoc !== null}
        onClose={() => setOpenDoc(null)}
        data={openDoc ?? FOOTER_DOCS.privacy}
      />
    </div>
  )
}