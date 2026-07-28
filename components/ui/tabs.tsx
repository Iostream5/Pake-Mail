"use client"

import { cn } from "@/lib/utils"

interface Tab {
  key: string
  label: string
}

interface TabsProps {
  tabs: Tab[]
  activeKey: string
  onTabChange: (key: string) => void
  className?: string
}

export function Tabs({ tabs, activeKey, onTabChange, className }: TabsProps) {
  return (
    <div className={cn("overflow-hidden border-b border-ash-stroke", className)}>
      <div className="flex items-center gap-8 overflow-x-auto hide-scrollbar whitespace-nowrap pb-0">
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "relative pb-3 font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-widest transition-colors",
                isActive
                  ? "text-bone"
                  : "text-warm-granite hover:text-bone"
              )}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 h-[2px] w-full bg-bone" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
