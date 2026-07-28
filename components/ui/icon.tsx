import { cn } from "@/lib/utils"

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string
  size?: "sm" | "md" | "lg" | "xl"
  filled?: boolean
}

const sizeClasses: Record<NonNullable<IconProps["size"]>, string> = {
  sm: "text-[16px]",
  md: "text-[20px]",
  lg: "text-[24px]",
  xl: "text-[32px]",
}

export function Icon({ name, size = "md", filled = false, className, ...props }: IconProps) {
  return (
    <span
      className={cn(
        "material-symbols-outlined",
        filled && "filled",
        sizeClasses[size],
        className
      )}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  )
}
