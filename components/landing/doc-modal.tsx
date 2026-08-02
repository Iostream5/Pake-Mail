"use client"

import * as React from "react"
import { useEffect } from "react"
import { Icon } from "@/components/ui/icon"

interface DocSection {
  heading: string
  body: string
  list?: string[]
}

export interface DocContent {
  id: string
  badge: string
  title: string
  updated: string
  intro: string
  sections: DocSection[]
}

interface ModalProps {
  open: boolean
  onClose: () => void
  data: DocContent
}

export function DocModal({ open, onClose, data }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="modal-overlay fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-obsidian-canvas/80 p-4 md:p-10 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={data.title}
    >
      <div
        className="modal-panel relative my-auto w-full max-w-3xl rounded-xl border border-ash-stroke bg-carbon-lift font-[family-name:var(--font-geist-sans)] text-bone shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-ash-stroke px-6 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-error-container" />
              <span className="h-3 w-3 rounded-full bg-signal-orange" />
              <span className="h-3 w-3 rounded-full bg-metric-green" />
            </div>
            <span className="hidden font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-widest text-warm-granite sm:inline">
              {data.badge} · V1.0
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 border border-ash-stroke px-3 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-widest text-warm-granite transition-colors hover:border-bone hover:text-bone"
            aria-label="Tutup"
          >
            <Icon name="close" size="sm" />
            Close
          </button>
        </div>

        {/* Title */}
        <div className="border-b border-ash-stroke/40 px-6 py-6 md:px-8">
          <h2 className="font-[family-name:var(--font-geist-sans)] text-2xl font-bold uppercase tracking-tight md:text-3xl">
            {data.title}
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-widest text-metric-green">
              TERMINAL_MODE_ACTIVE
            </span>
            <span className="h-1 w-1 rounded-full bg-ash-stroke" />
            <span className="font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-widest text-warm-granite">
              UPDATED: {data.updated}
            </span>
          </div>
          <p className="mt-4 font-[family-name:var(--font-geist-sans)] text-sm leading-relaxed text-warm-granite">
            {data.intro}
          </p>
        </div>

        {/* Body */}
        <div className="max-h-[50vh] space-y-8 overflow-y-auto px-6 py-6 md:px-8">
          {data.sections.map((section, i) => (
            <section key={i}>
              <h3 className="mb-2 flex items-center gap-3 font-[family-name:var(--font-geist-mono)] text-xs font-bold uppercase tracking-widest text-bone">
                <span className="text-signal-orange">{String(i + 1).padStart(2, "0")}.</span>
                {section.heading}
              </h3>
              <p className="font-[family-name:var(--font-geist-sans)] text-sm leading-relaxed text-warm-granite">
                {section.body}
              </p>
              {section.list && (
                <ul className="mt-3 space-y-2">
                  {section.list.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 font-[family-name:var(--font-geist-sans)] text-sm leading-relaxed text-warm-granite">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-metric-green" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}