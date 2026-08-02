"use client"

import * as React from "react"
import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

gsap.registerPlugin(useGSAP)

interface MagneticProps {
  children: React.ReactNode
  /** How strongly the element is pulled toward the cursor (px at max) */
  strength?: number
  className?: string
}

export function Magnetic({ children, strength = 14, className }: MagneticProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return

      const onMove = (e: MouseEvent) => {
        const rect = root.getBoundingClientRect()
        const relX = e.clientX - (rect.left + rect.width / 2)
        const relY = e.clientY - (rect.top + rect.height / 2)
        gsap.to(root, {
          x: relX * 0.25,
          y: relY * 0.25,
          duration: 0.4,
          ease: "power2.out",
        })
        const inner = root.firstElementChild as HTMLElement | null
        if (inner) {
          gsap.to(inner, {
            x: relX * 0.2 * (strength / 50),
            y: relY * 0.2 * (strength / 50),
            duration: 0.4,
            ease: "power2.out",
          })
        }
      }
      const onLeave = () => {
        gsap.to(root, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" })
        const inner = root.firstElementChild as HTMLElement | null
        if (inner) gsap.to(inner, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" })
      }

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
    <div ref={rootRef} className={className}>
      {children}
    </div>
  )
}