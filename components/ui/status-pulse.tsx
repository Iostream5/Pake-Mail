import { cn } from "@/lib/utils"

export type StatusPulseColor = "orange" | "green" | "bone"

interface StatusPulseProps {
  color?: StatusPulseColor
  label?: string
  className?: string
}

const colorMap: Record<StatusPulseColor, { dot: string; text: string }> = {
  orange: { dot: "bg-signal-orange", text: "text-signal-orange" },
  green: { dot: "bg-metric-green", text: "text-metric-green" },
  bone: { dot: "bg-bone", text: "text-bone" },
}

export function StatusPulse({ color = "orange", label, className }: StatusPulseProps) {
  const colors = colorMap[color]

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn("block h-1.5 w-1.5 rounded-full animate-status-pulse", colors.dot)}
        aria-hidden="true"
      />
      {label && (
        <span
          className={cn(
            "font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-widest",
            colors.text
          )}
        >
          {label}
        </span>
      )}
    </div>
  )
}
