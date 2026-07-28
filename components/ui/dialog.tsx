"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

function Dialog({ open, onClose, children, title, description, className }: DialogProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    if (open) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-black/80 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          "relative z-10 mx-auto w-full max-w-lg rounded-[10px] border border-ash-stroke bg-carbon-lift p-6 shadow-2xl text-bone",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "dialog-title" : undefined}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-warm-granite hover:text-bone transition-colors"
          aria-label="Tutup"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {title && (
          <h2 id="dialog-title" className="font-[family-name:var(--font-geist-sans)] text-xl font-medium text-bone tracking-tight">
            {title}
          </h2>
        )}
        {description && (
          <p className="mt-1 text-xs font-[family-name:var(--font-geist-mono)] text-warm-granite uppercase tracking-wider">{description}</p>
        )}

        <div className={cn(title && "mt-4")}>{children}</div>
      </div>
    </div>
  )
}

export { Dialog }