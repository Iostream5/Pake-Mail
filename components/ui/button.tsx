import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "ghost"
    | "bone"
    | "danger"
    | "functional-orange"
    | "functional-green"
    | "default"
    | "outline"
    | "secondary"
  size?: "sm" | "md" | "lg"
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // Base
          "inline-flex items-center justify-center gap-2 font-[family-name:var(--font-geist-mono)] text-xs font-medium uppercase tracking-widest transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bone/40 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-canvas disabled:pointer-events-none disabled:opacity-50 press-effect",

          // Variants
          (variant === "primary" || variant === "default") &&
            "rounded-[3px] bg-chalk text-ink-black hover:bg-bone active:opacity-90",
          (variant === "ghost" || variant === "outline" || variant === "secondary") &&
            "rounded-[3px] border border-ash-stroke bg-transparent text-bone hover:bg-carbon-lift",
          variant === "bone" &&
            "rounded-[3px] bg-bone text-ink-black hover:bg-chalk",
          variant === "danger" &&
            "rounded-[3px] bg-error-container text-on-error-container hover:brightness-110",
          variant === "functional-orange" &&
            "rounded-[3px] bg-transparent text-signal-orange hover:bg-signal-orange/10",
          variant === "functional-green" &&
            "rounded-[3px] bg-transparent text-metric-green hover:bg-metric-green/10",

          // Sizes
          size === "sm" && "h-8 px-3 text-[10px]",
          size === "md" && "h-10 px-5 text-xs",
          size === "lg" && "h-12 px-8 text-xs",

          className
        )}
        {...props}
      >
        {loading && (
          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }