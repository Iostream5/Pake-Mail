"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger, useGSAP)

/**
 * Attach to the landing page root. Drives all scroll-driven animation:
 * - `[data-reveal]`      → single element fades+slides up when scrolled into view
 * - `.reveal-stagger > *` → children animate up with a stagger
 * Reduced motion is respected; in that case nothing is hidden.
 */
export function useScrollReveal() {
  const scope = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el, i) => {
          const fromBottom = el.dataset.reveal !== "fade"
          gsap.fromTo(
            el,
            { y: fromBottom ? 46 : 24, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.9,
              ease: "power3.out",
              delay: 0.05,
              scrollTrigger: {
                trigger: el,
                start: "top 86%",
                toggleActions: "play none none none",
              },
            }
          )
        })

        gsap.utils.toArray<HTMLElement>("[data-stagger]").forEach((group) => {
          const children = group.children as HTMLCollectionOf<HTMLElement>
          const el = Array.from(children)
          gsap.fromTo(
            el,
            { y: 56, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.8,
              ease: "power3.out",
              stagger: 0.1,
              scrollTrigger: {
                trigger: group,
                start: "top 82%",
                toggleActions: "play none none none",
              },
            }
          )
        })

        // Parallax drift on large visual blocks
        gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
          const speed = Number(el.dataset.parallax) || 0.2
          gsap.fromTo(
            el,
            { yPercent: 8 * speed },
            {
              yPercent: -8 * speed,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            }
          )
        })

        // Progress fill when visible
        gsap.utils.toArray<HTMLElement>("[data-progress]").forEach((el) => {
          const width = el.dataset.progress || "75%"
          gsap.fromTo(
            el,
            { width: "0%" },
            {
              width,
              duration: 1.6,
              ease: "power3.out",
              delay: 0.2,
              scrollTrigger: {
                trigger: el,
                start: "top 88%",
                once: true,
              },
            }
          )
        })

        return () => {
          /* mm.revert() will tear down everything created here */
        }
      })

      return () => {
        mm.revert()
      }
    },
    { scope }
  )

  return scope
}