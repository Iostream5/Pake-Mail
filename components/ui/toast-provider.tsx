"use client"

import { Toaster as Sonner } from "sonner"

export function ToastProvider() {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast font-[family-name:var(--font-geist-sans)] border border-ash-stroke bg-carbon-lift text-bone shadow-2xl rounded-lg p-4",
          description: "text-warm-granite text-xs",
          actionButton: "bg-bone text-ink-black font-semibold text-xs rounded-md px-3 py-1.5",
          cancelButton: "bg-transparent text-warm-granite hover:text-bone text-xs rounded-md px-3 py-1.5",
        },
      }}
    />
  )
}
