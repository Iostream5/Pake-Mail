import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-")

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="font-[family-name:var(--font-geist-mono)] text-[10px] font-normal uppercase tracking-widest text-warm-granite"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "flex h-10 w-full rounded-[3px] border border-ash-stroke bg-carbon-lift px-3 py-2 text-sm text-bone focus-visible:outline-none focus-visible:border-bone disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-signal-orange focus-visible:border-signal-orange",
            className
          )}
          aria-invalid={!!error}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-carbon-lift text-warm-granite">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-carbon-lift text-bone">
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs text-signal-orange" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }