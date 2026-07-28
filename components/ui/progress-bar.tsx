import { cn } from "@/lib/utils"

export type ProgressBarColor = "bone" | "metric-green" | "signal-orange"

interface ProgressBarProps {
  value: number
  color?: ProgressBarColor
  className?: string
}

const fillColorMap: Record<ProgressBarColor, string> = {
  bone: "bg-bone",
  "metric-green": "bg-metric-green",
  "signal-orange": "bg-signal-orange",
}

export function ProgressBar({ value, color = "bone", className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div
      className={cn("h-1 w-full overflow-hidden rounded-full bg-ash-stroke", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full transition-all duration-700 ease-out", fillColorMap[color])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
