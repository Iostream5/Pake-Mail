"use client"

import { createContext, useContext, useState, useCallback, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "./sidebar"
import { Header } from "./header"

interface SidebarContextType {
  isOpen: boolean
  toggle: () => void
  close: () => void
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

export function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: { name?: string | null; email?: string | null }
}) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])
  const close = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    close()
  }, [pathname, close])

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, close }}>
      <div className="flex h-full min-h-screen bg-obsidian-canvas">
        <Sidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header user={user} />
          <main className="flex-1 overflow-auto px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  )
}