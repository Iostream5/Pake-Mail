import { cn } from "@/lib/utils"

export type MonoLabelSize = "xs" | "sm"
export type MonoLabelColor = "warm-granite" | "bone" | "signal-orange" | "metric-green" | "ink-black"

interface MonoLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: MonoLabelSize
  color?: MonoLabelColor
  as?: "span" | "p" | "label" | "div"
}

const sizeClasses: Record<MonoLabelSize, string> = {
  xs: "text-[10px] leading-[12px]",
  sm: "text-xs leading-[12px]",
}

const colorClasses: Record<MonoLabelColor, string> = {
  "warm-granite": "text-warm-granite",
  bone: "text-bone",
  "signal-orange": "text-signal-orange",
  "metric-green": "text-metric-green",
  "ink-black": "text-ink-black",
}

export function MonoLabel({
  size = "xs",
  color = "warm-granite",
  as: Component = "span",
  className,
  children,
  ...props
}: MonoLabelProps) {
  return (
    <Component
      className={cn(
        "font-[family-name:var(--font-geist-mono)] uppercase tracking-widest",
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
