import * as React from "react"
import { cn } from "@/lib/utils"

export type BadgeVariant =
  | "default"
  | "orange"
  | "green"
  | "bone"
  | "info"
  | "warning"
  | "danger"
  | "success"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[3px] px-2.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-widest transition-colors",

        (variant === "default" || variant === "info") &&
          "bg-carbon-lift text-warm-granite",
        (variant === "orange" || variant === "warning") &&
          "bg-signal-orange/15 text-signal-orange",
        (variant === "green" || variant === "success") &&
          "bg-metric-green/15 text-metric-green",
        variant === "danger" &&
          "bg-error-container/20 text-error",
        variant === "bone" &&
          "bg-bone/10 text-bone",

        className
      )}
      {...props}
    />
  )
}

export { Badge }