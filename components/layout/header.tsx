"use client"

import { signOut } from "next-auth/react"
import { useSidebar } from "./dashboard-shell"
import { Icon } from "@/components/ui/icon"
import { StatusPulse } from "@/components/ui/status-pulse"
import { MonoLabel } from "@/components/ui/mono-label"

export function Header({ user }: { user: { name?: string | null } }) {
  const { toggle } = useSidebar()

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?"

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ash-stroke bg-obsidian-canvas px-4 lg:px-8">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          className="rounded p-2 text-bone hover:bg-carbon-lift transition-colors lg:hidden"
          aria-label="Buka menu"
        >
          <Icon name="menu" size="lg" />
        </button>
        <h1 className="font-[family-name:var(--font-geist-sans)] text-2xl font-normal text-bone uppercase tracking-tighter">
          Pake Mail
        </h1>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* System status — desktop only */}
        <div className="hidden items-center gap-2 md:flex flex-col items-end mr-2">
          <MonoLabel size="xs">System Status</MonoLabel>
          <StatusPulse color="green" label="Operational" />
        </div>

        {/* User avatar */}
        <button
          onClick={() => signOut()}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-ash-stroke bg-carbon-lift text-xs font-bold text-bone hover:bg-bone hover:text-ink-black transition-colors"
          title="Keluar"
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
