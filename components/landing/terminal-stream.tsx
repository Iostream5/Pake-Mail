"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"

interface TypeLine {
  msg: string
  tone?: "granite" | "green" | "bone" | "orange"
}

const toneClass: Record<NonNullable<TypeLine["tone"]>, string> = {
  granite: "text-warm-granite",
  green: "text-metric-green",
  bone: "text-bone",
  orange: "text-signal-orange",
}

interface TerminalStreamProps {
  lines: TypeLine[]
  loop?: boolean
  className?: string
  /** Typing speed in ms per character */
  rate?: number
}

export function TerminalStream({ lines, loop = false, className, rate = 24 }: TerminalStreamProps) {
  const [shown, setShown] = useState<number>(0)
  const [typed, setTyped] = useState<string>("")
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // Advance to the next line once all lines are done (or restart when looping).
  useEffect(() => {
    if (shown < lines.length) return
    if (!loop) return

    const idle = setTimeout(() => {
      if (!mounted.current) return
      setShown(0)
      setTyped("")
    }, 2400)
    return () => clearTimeout(idle)
  }, [shown, lines.length, loop])

  useEffect(() => {
    if (shown >= lines.length) return

    const full = lines[shown].msg
    let i = 0
    let advance: ReturnType<typeof setTimeout> | undefined

    const typeTimer = setInterval(() => {
      i += 1
      if (mounted.current) setTyped(full.slice(0, i))
      if (i >= full.length) {
        clearInterval(typeTimer)
        advance = setTimeout(() => {
          if (mounted.current) setShown((v) => v + 1)
        }, 420)
      }
    }, rate)

    return () => {
      clearInterval(typeTimer)
      if (advance) clearTimeout(advance)
    }
  }, [shown, lines, rate])

  return (
    <div className={className}>
      {lines.slice(0, shown).map((line, i) => (
        <p key={i} className={toneClass[line.tone ?? "granite"]}>
          {line.msg}
        </p>
      ))}
      {shown < lines.length && (
        <p className={toneClass[lines[shown].tone ?? "granite"]}>
          {`> ${typed}`}
          <span className="ml-0.5 inline-block h-[10px] w-[7px] translate-y-[1px] bg-metric-green animate-status-pulse" aria-hidden="true" />
        </p>
      )}
    </div>
  )
}