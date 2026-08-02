"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSidebar } from "./dashboard-shell"
import { Icon } from "@/components/ui/icon"
import { MonoLabel } from "@/components/ui/mono-label"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/dashboard/profile", label: "Profile", icon: "person" },
  { href: "/dashboard/documents", label: "Documents", icon: "description" },
  { href: "/dashboard/templates", label: "Template", icon: "style" },
  { href: "/dashboard/recipients", label: "Recipients", icon: "group" },
  { href: "/dashboard/batches", label: "Batches", icon: "layers" },
  { href: "/dashboard/replies", label: "Replies", icon: "forward_to_inbox" },
  { href: "/dashboard/resend", label: "Resend", icon: "repeat" },
  { href: "/dashboard/email-accounts", label: "Email Accounts", icon: "mail" },
  { href: "/dashboard/settings", label: "Settings", icon: "tune" },
]

export function Sidebar({ user }: { user: { name?: string | null; email?: string | null } }) {
  const pathname = usePathname()
  const { isOpen, close } = useSidebar()

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?"

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink-black/60 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-ash-stroke bg-carbon-lift py-8 transition-transform duration-200 ease-in-out",
          "lg:static lg:z-auto lg:translate-x-0 lg:transition-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="px-6 mb-8">
          <Link
            href="/dashboard"
            onClick={close}
            className="block"
          >
            <h1 className="font-[family-name:var(--font-geist-sans)] text-2xl font-normal text-bone tracking-tighter uppercase">
              Pake Mail
            </h1>
          </Link>
          <MonoLabel className="mt-2 block">System_Operations</MonoLabel>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={cn(
                  "flex items-center gap-4 border-l-2 px-6 py-3 transition-all duration-150",
                  isActive
                    ? "border-bone bg-obsidian-canvas text-bone"
                    : "border-transparent text-warm-granite hover:bg-obsidian-canvas hover:text-bone"
                )}
              >
                <Icon
                  name={item.icon}
                  size="md"
                  filled={isActive}
                />
                <MonoLabel size="sm" color={isActive ? "bone" : "warm-granite"}>
                  {item.label}
                </MonoLabel>
              </Link>
            )
          })}
        </nav>

        {/* User info footer */}
        <div className="px-4 pt-6 border-t border-ash-stroke mt-6">
          <div className="flex items-center gap-3 rounded-lg bg-obsidian-canvas p-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-bone text-ink-black font-bold text-xs">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-bold text-bone">{user.name}</p>
              <p className="truncate text-[10px] text-warm-granite">{user.email}</p>
            </div>
            <Link href="/dashboard/settings" onClick={close}>
              <Icon name="tune" size="sm" className="text-warm-granite flex-shrink-0" />
            </Link>
          </div>
        </div>
      </aside>
    </>
  )
}
