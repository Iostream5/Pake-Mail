import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="font-[family-name:var(--font-geist-mono)] text-[10px] font-normal uppercase tracking-widest text-warm-granite"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "flex h-10 w-full rounded-[3px] border border-ash-stroke bg-carbon-lift px-3 py-2 text-sm text-bone placeholder:text-warm-granite/50 transition-colors focus-visible:outline-none focus-visible:border-bone disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-signal-orange focus-visible:border-signal-orange",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-signal-orange" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-xs text-warm-granite">{helperText}</p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }