"use client"

import * as React from "react"
import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger, useGSAP)

interface AnimatedNumberProps {
  value: number
  decimals?: number
  suffix?: string
  prefix?: string
  className?: string
}

const fmt = (val: number, decimals: number) =>
  val.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  className,
}: AnimatedNumberProps) {
  const numRef = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      const target = numRef.current
      if (!target) return
      const proxy = { val: 0 }
      const tween = gsap.to(proxy, {
        val: value,
        duration: 2,
        ease: "power3.out",
        onUpdate: () => {
          target.textContent = `${prefix}${fmt(proxy.val, decimals)}${suffix}`
        },
        scrollTrigger: {
          trigger: target,
          start: "top 88%",
          once: true,
        },
      })
      return () => {
        tween.scrollTrigger?.kill()
        tween.kill()
      }
    },
    { scope: numRef }
  )

  return (
    <span ref={numRef} className={className} aria-label={`${prefix}${fmt(value, decimals)}${suffix}`}>
      {`${prefix}0${suffix}`}
    </span>
  )
}