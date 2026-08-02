"use client"

import * as React from "react"
import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

gsap.registerPlugin(useGSAP)

interface SpotlightProps {
  children: React.ReactNode
  className?: string
  /** Base opacity of the glow (0..1) */
  intensity?: number
}

export function Spotlight({ children, className, intensity = 0.14 }: SpotlightProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const root = rootRef.current
      const glow = glowRef.current
      if (!root || !glow) return

      const setGlow = (x: number, y: number) => {
        gsap.to(glow, {
          x,
          y,
          opacity: intensity,
          duration: 0.45,
          ease: "power2.out",
          overwrite: "auto",
        })
      }

      const onMove = (e: MouseEvent) => {
        const rect = root.getBoundingClientRect()
        setGlow(e.clientX - rect.left, e.clientY - rect.top)
      }
      const onLeave = () => gsap.to(glow, { opacity: 0, duration: 0.4, ease: "power2.out" })

      root.addEventListener("mousemove", onMove)
      root.addEventListener("mouseleave", onLeave)
      return () => {
        root.removeEventListener("mousemove", onMove)
        root.removeEventListener("mouseleave", onLeave)
      }
    },
    { scope: rootRef }
  )

  return (
    <div ref={rootRef} className={`relative overflow-hidden ${className ?? ""}`}>
      <div
        ref={glowRef}
        className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0"
        style={{
          background:
            "radial-gradient(circle at center, var(--color-signal-orange), transparent 65%)",
        }}
        aria-hidden="true"
      />
      {children}
    </div>
  )
}