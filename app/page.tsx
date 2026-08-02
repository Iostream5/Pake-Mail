"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Icon } from "@/components/ui/icon"
import { StatusPulse } from "@/components/ui/status-pulse"
import { AnimatedNumber } from "@/components/landing/animated-number"
import { TerminalStream } from "@/components/landing/terminal-stream"
import { Spotlight } from "@/components/landing/spotlight"
import { Magnetic } from "@/components/landing/magnetic"
import { useScrollReveal } from "@/components/landing/use-scroll-reveal"
import { DocModal, type DocContent } from "@/components/landing/doc-modal"
import { FOOTER_DOCS } from "@/components/landing/docs-content"

const translations = {
  id: {
    metaTitle: "PAKE MAIL | Sistem Manajemen Batch Lamaran Kerja",
    nav: {
      product: "Produk",
      features: "Fitur",
      pricing: "Harga",
      login: "Masuk",
      getStarted: "Mulai"
    },
    hero: {
      status: "STATUS_SISTEM: AKTIF",
      titlePre: "Manajemen Pengiriman",
      titleHighlight: "Lamaran Kerja",
      titlePost: "via Email",
      description: "Platform pusat kendali untuk job seeker. Kirim batch lamaran terstruktur, aman, dan pantau status real-time tanpa repot copy-paste.",
      ctaPrimary: "MULAI BATCH SEKARANG",
      ctaSecondary: "DOKUMENTASI SISTEM",
      stats: {
        dailyLimit: "BATAS HARIAN",
        attachmentError: "ERROR LAMPIRAN",
        community: "+2rb Pengguna"
      },
      mockup: {
        encryption: "ENCRYPTION: AES-256",
        batchProgress: "PROGRES_BATCH: 75%"
      }
    },
    problem: {
      tag: "DIAGNOSIS_TERMINAL",
      title: "Masalah Klasik Melamar Kerja",
      cards: [
        {
          title: "Manual Repetition",
          desc: "Berhenti membuang waktu untuk copy-paste Subject dan Body email ratusan kali secara manual."
        },
        {
          title: "Blind Tracking",
          desc: "Lupakan spreadsheet berantakan. Pantau status lamaran dari 'Pending' sampai 'Interview' di satu tempat."
        },
        {
          title: "Doc Chaos",
          desc: "Salah lampir CV adalah fatal. Smart attachment memastikan dokumen yang tepat sampai ke HR yang tepat."
        }
      ]
    },
    wizard: {
      tag: "ANTARMUKA_SISTEM_UTAMA",
      title: "Workflow Wizard 7 Langkah",
      desc: "Pusat orkestrasi pengiriman yang menggabungkan seluruh aset data Anda menjadi satu kampanye lamaran yang solid.",
      steps: [
        "1. Nama Batch",
        "2. Akun Email",
        "3. Template",
        "4. Dokumen",
        "5. Perusahaan",
        "6. Jadwal",
        "7. Preview"
      ],
      stepTitle: [
        "Konfigurasi Identitas Batch",
        "Hubungkan Akun Email",
        "Pilih & Sesuaikan Template",
        "Unggah Dokumen Lamaran",
        "Daftar Perusahaan Penerima",
        "Penjadwal Cerdas (Scheduler)",
        "Tinjau & Luncurkan Batch"
      ],
      fields: {
        batchName: "NAMA BATCH LAMARAN",
        batchDesc: "DESKRIPSI (OPSIONAL)",
        placeholderDesc: "Input detail spesifik batch ini...",
        nextBtn: "LANJUT: PILIH AKUN",
        nextAccount: "LANJUT: TEMPLATE",
        nextTemplate: "LANJUT: DOKUMEN",
        nextDoc: "LANJUT: PERUSAHAAN",
        nextCompany: "LANJUT: JADWAL",
        nextSchedule: "LANJUT: PREVIEW",
        nextPreview: "MULAI BATCH SEKARANG",
        accountLabel: "PILIH AKUN GMAIL",
        templateLabel: "PILIH CONTOH TEMPLATE",
        docLabel: "CV & PORTOFOLIO",
        companyLabel: "DAFTAR PENERIMA (CSV/EXCEL)",
        scheduleLabel: "WAKTU ANTARA PENGIRIMAN (DETIK)"
      }
    },
    bento: {
      auth: {
        title: "Multi-Account Auth",
        desc: "Gunakan Gmail OAuth untuk keamanan maksimal. Hubungkan beberapa akun sekaligus untuk segmentasi lamaran profesional dan personal."
      },
      library: {
        title: "Doc Library",
        desc: "Simpan berbagai versi CV, Portofolio, dan Sertifikat. Reusable untuk setiap batch yang berbeda."
      },
      variable: {
        title: "Smart Variable",
        desc: "Ubah {{company}} dan {{position}} secara otomatis di setiap email. Personalisasi massal dalam hitungan detik."
      },
      scheduler: {
        title: "Intelligent Scheduler",
        desc: "Atur delay antar pengiriman (30-120 detik) untuk menghindari flag spam. Tentukan jam aktif agar email sampai di pagi hari saat HR online.",
        btn: "LIHAT MEKANISME"
      }
    },
    cta: {
      tag: "DEPLOI_MISI_SIAP",
      title: "Siap Menaklukkan",
      titleHighlight: "Karir Impian?",
      desc: "Bergabunglah dengan ribuan job seeker yang sudah beralih dari pengiriman manual ke efisiensi Batch Lamaran.",
      btnPrimary: "MULAI SEKARANG",
      btnSecondary: "LIHAT DEMO VIDEO"
    },
    footer: {
      desc: "Sistem manajemen lamaran kerja modular. Dibangun untuk kecepatan, ketepatan, dan transparansi data.",
      resources: "SUMBER DAYA",
      legal: "HUKUM",
      systemsGo: "SEMUA SISTEM OK"
    }
  },
  en: {
    metaTitle: "PAKE MAIL | Job Application Batch Management System",
    nav: {
      product: "Product",
      features: "Features",
      pricing: "Pricing",
      login: "Login",
      getStarted: "Get Started"
    },
    hero: {
      status: "SYSTEM_STATUS: OPERATIONAL",
      titlePre: "Job Application",
      titleHighlight: "Batch Delivery",
      titlePost: "via Email",
      description: "Control center platform for job seekers. Send structured, secure batch applications, and monitor real-time status without manual copy-paste hassle.",
      ctaPrimary: "START BATCH NOW",
      ctaSecondary: "SYSTEM DOCUMENTATION",
      stats: {
        dailyLimit: "DAILY LIMIT",
        attachmentError: "ATTACHMENT ERROR",
        community: "+2k Active Users"
      },
      mockup: {
        encryption: "ENCRYPTION: AES-256",
        batchProgress: "BATCH_PROGRESS: 75%"
      }
    },
    problem: {
      tag: "TERMINAL_DIAGNOSIS",
      title: "Classic Job Seeking Problems",
      cards: [
        {
          title: "Manual Repetition",
          desc: "Stop wasting time manually copy-pasting email subjects and bodies hundreds of times."
        },
        {
          title: "Blind Tracking",
          desc: "Forget messy spreadsheets. Track application status from 'Pending' to 'Interview' in one place."
        },
        {
          title: "Doc Chaos",
          desc: "Attaching the wrong CV is fatal. Smart attachment ensures the right document reaches the right HR."
        }
      ]
    },
    wizard: {
      tag: "CORE_SYSTEM_INTERFACE",
      title: "7-Step Workflow Wizard",
      desc: "Delivery orchestration hub that combines all your data assets into one solid application campaign.",
      steps: [
        "1. Batch Name",
        "2. Email Account",
        "3. Template",
        "4. Document",
        "5. Company",
        "6. Schedule",
        "7. Preview"
      ],
      stepTitle: [
        "Configure Batch Identity",
        "Connect Email Account",
        "Select & Customize Template",
        "Upload Application Documents",
        "Recipient Company List",
        "Intelligent Scheduler Settings",
        "Review & Launch Batch"
      ],
      fields: {
        batchName: "BATCH APPLICATION NAME",
        batchDesc: "DESCRIPTION (OPTIONAL)",
        placeholderDesc: "Enter specific details for this batch...",
        nextBtn: "NEXT: SELECT ACCOUNT",
        nextAccount: "NEXT: TEMPLATE",
        nextTemplate: "NEXT: DOCUMENTS",
        nextDoc: "NEXT: COMPANY",
        nextCompany: "NEXT: SCHEDULE",
        nextSchedule: "NEXT: PREVIEW",
        nextPreview: "START BATCH NOW",
        accountLabel: "SELECT GMAIL ACCOUNT",
        templateLabel: "SELECT EXAMPLE TEMPLATE",
        docLabel: "CV & PORTFOLIO",
        companyLabel: "RECIPIENTS LIST (CSV/EXCEL)",
        scheduleLabel: "DELAY BETWEEN SENDS (SECONDS)"
      }
    },
    bento: {
      auth: {
        title: "Multi-Account Auth",
        desc: "Use Gmail OAuth for maximum security. Connect multiple accounts simultaneously for professional and personal application segmentation."
      },
      library: {
        title: "Doc Library",
        desc: "Store various versions of your CV, Portfolio, and Certificates. Reusable for every different batch."
      },
      variable: {
        title: "Smart Variable",
        desc: "Automatically change {{company}} and {{position}} in every email. Bulk personalization in seconds."
      },
      scheduler: {
        title: "Intelligent Scheduler",
        desc: "Set a delay between sends (30-120 seconds) to avoid spam flags. Set active hours so emails arrive in the morning when HR is online.",
        btn: "VIEW MECHANISM"
      }
    },
    cta: {
      tag: "DEPLOY_MISSION_READY",
      title: "Ready to Conquer",
      titleHighlight: "Dream Career?",
      desc: "Join thousands of job seekers who have switched from manual sending to the efficiency of Batch Applications.",
      btnPrimary: "START NOW",
      btnSecondary: "WATCH DEMO VIDEO"
    },
    footer: {
      desc: "Modular job application management system. Built for speed, accuracy, and data transparency.",
      resources: "RESOURCES",
      legal: "LEGAL",
      systemsGo: "ALL SYSTEMS GO"
    }
  }
}

export default function Home() {
  const [lang, setLang] = useState<"id" | "en">("id")
  const [activeStep, setActiveStep] = useState<number>(0)
  const [activeNav, setActiveNav] = useState<string>("product")
  const [openDoc, setOpenDoc] = useState<DocContent | null>(null)
  const [mobileOpen, setMobileOpen] = useState<boolean>(false)

  useEffect(() => {
    const ids = ["product", "features"]
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const target = visible[0]
        if (target) setActiveNav(target.target.id)
      },
      { rootMargin: "-25% 0px -55% 0px" }
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const t = translations[lang]
  const scope = useScrollReveal()

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
        tl.from(
          ".hero-title-line",
          { y: 26, autoAlpha: 0, duration: 0.9, stagger: 0.1 },
          "-=0.25"
        )
          .from(".hero-desc", { y: 24, autoAlpha: 0, duration: 0.7 }, "-=0.5")
          .from(".hero-cta", { y: 22, autoAlpha: 0, duration: 0.6, stagger: 0.08 }, "-=0.45")
          .from(".hero-stats > *", { y: 24, autoAlpha: 0, duration: 0.6, stagger: 0.08 }, "-=0.4")
          .from(
            ".hero-mockup",
            { scale: 0.9, y: 30, autoAlpha: 0, duration: 0.8, ease: "back.out(1.4)" },
            "-=1.4"
          )
        return () => tl.kill()
      })
      return () => mm.revert()
    },
    { scope }
  )

  const handleNextStep = () => {
    setActiveStep((prev) => (prev + 1) % 7)
  }

  // Subtle step-transition micro-interaction
  useEffect(() => {
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tween = gsap.fromTo(
        ".wizard-step",
        { y: 16, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.45, ease: "power2.out", stagger: 0.04 }
      )
      return () => tween.kill()
    })
    return () => mm.revert()
  }, [activeStep])

  return (
    <div ref={scope} className="flex flex-col min-h-screen bg-obsidian-canvas text-bone overflow-x-hidden selection:bg-bone selection:text-obsidian-canvas">
      {/* ─── Top App Bar ─── */}
      <header className="fixed top-0 left-0 w-full z-50 bg-obsidian-canvas/80 backdrop-blur-md border-b border-ash-stroke">
        <nav className="flex justify-between items-center w-full px-4 md:px-10 py-3 max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Pake Mail"
              className="h-7 w-7 md:h-9 md:w-9 flex-shrink-0 object-contain"
            />
            <span className="text-xl md:text-2xl font-[family-name:var(--font-geist-sans)] font-black text-bone uppercase tracking-tighter">
              Pake Mail
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {[
              { id: "product", label: t.nav.product },
              { id: "features", label: t.nav.features },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-widest pb-1 border-b-2 transition-colors ${activeNav === item.id
                  ? "text-bone border-bone"
                  : "text-warm-granite border-transparent hover:text-bone hover:border-bone/40"
                  }`}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {/* Language Switch Toggle */}
            <button
              onClick={() => setLang((prev) => (prev === "id" ? "en" : "id"))}
              className="flex items-center gap-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-wider border border-ash-stroke bg-carbon-lift hover:bg-ash-stroke/30 text-bone px-2.5 py-1.5 rounded-[3px] transition-colors"
            >
              <span className={lang === "id" ? "text-bone font-black" : "text-warm-granite"}>ID</span>
              <span className="text-ash-stroke">|</span>
              <span className={lang === "en" ? "text-bone font-black" : "text-warm-granite"}>EN</span>
            </button>

            <Link href="/login">
              <button className="hidden sm:inline-block font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-wider text-warm-granite hover:text-bone transition-colors px-2 py-1">
                {t.nav.login}
              </button>
            </Link>

            <Link href="/register">
              <button className="bg-bone text-ink-black px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-widest rounded-[3px] hover:scale-95 transition-transform active:scale-90">
                {t.nav.getStarted}
              </button>
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-[4px] border border-ash-stroke bg-carbon-lift md:hidden"
              aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={mobileOpen}
            >
              <span className={`h-0.5 w-5 bg-bone transition-all duration-300 ${mobileOpen ? "translate-y-[6px] rotate-45" : ""}`} />
              <span className={`h-0.5 w-5 bg-bone transition-all duration-300 ${mobileOpen ? "opacity-0" : ""}`} />
              <span className={`h-0.5 w-5 bg-bone transition-all duration-300 ${mobileOpen ? "-translate-y-[6px] -rotate-45" : ""}`} />
            </button>
          </div>
        </nav>

        {/* Mobile menu panel */}
        {mobileOpen && (
          <div className="md:hidden border-t border-ash-stroke bg-obsidian-canvas/95 backdrop-blur-md px-4 py-4">
            {[
              { id: "product", label: t.nav.product },
              { id: "features", label: t.nav.features },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setMobileOpen(false)}
                className={`flex min-h-[48px] items-center justify-between border-b border-ash-stroke/40 py-3 font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-widest transition-colors ${activeNav === item.id ? "text-bone" : "text-warm-granite hover:text-bone"
                  }`}
              >
                {item.label}
                {activeNav === item.id && <Icon name="chevron_right" size="sm" className="text-signal-orange" />}
              </a>
            ))}
            <a
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-[48px] items-center py-3 font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-widest text-warm-granite transition-colors hover:text-bone"
            >
              {t.nav.login}
            </a>
          </div>
        )}
      </header>

      <main className="">
        {/* ─── Hero Section ─── */}
        <section id="product" className="relative isolate flex min-h-[100vh] items-center px-0 pt-28 md:pt-32">
          {/* Full-screen living background layers (edge-to-edge, full height) */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(1200px 600px at 20% -10%, rgba(238,96,24,0.10), transparent 60%), radial-gradient(900px 500px at 110% 20%, rgba(160,202,146,0.08), transparent 55%)",
              }}
              aria-hidden="true"
            />
            <div className="terminal-grid absolute inset-0" aria-hidden="true" />
            <div
              className="conic-glow absolute left-1/2 top-[-45%] h-[70vmax] w-[70vmax] -translate-x-1/2 rounded-full opacity-[0.08] blur-3xl"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent, var(--color-signal-orange), transparent 40%)",
              }}
              aria-hidden="true"
            />
            <div className="scan-line absolute inset-x-0 h-1/2" aria-hidden="true" />
            {/* soft fade so the grid blends into the next section */}
            <div
              className="absolute inset-x-0 bottom-0 h-40"
              style={{
                background: "linear-gradient(to bottom, transparent, var(--color-obsidian-canvas))",
              }}
              aria-hidden="true"
            />
          </div>

          <div className="relative z-10 max-w-[1200px] mx-auto px-4 md:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-8">
                <h1 className="font-[family-name:var(--font-geist-sans)] text-4xl sm:text-6xl md:text-7xl font-light text-bone mb-6 uppercase leading-none tracking-tighter">
                  <span className="hero-title-line inline-block">{t.hero.titlePre}</span>{" "}
                  <span className="hero-title-line inline-block text-warm-granite font-normal">{t.hero.titleHighlight}</span>{" "}
                  <span className="hero-title-line inline-block">{t.hero.titlePost}</span>
                </h1>
                <p className="hero-desc font-[family-name:var(--font-geist-sans)] text-base md:text-xl text-warm-granite max-w-2xl mb-8 leading-relaxed tracking-tight">
                  {t.hero.description}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mb-12">
                  <div className="hero-cta w-full sm:w-auto">
                    <Magnetic strength={18}>
                      <Link href="/register">
                        <button className="w-full sm:w-auto bg-bone text-ink-black px-8 py-4 font-[family-name:var(--font-geist-mono)] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 rounded-[3px] hover:translate-y-[-2px] transition-shadow shadow-[0_4px_0_0_#3d3a39] hover:shadow-[0_6px_16px_rgba(238,238,238,0.25)]">
                          {t.hero.ctaPrimary}
                          <Icon name="bolt" size="sm" />
                        </button>
                      </Link>
                    </Magnetic>
                  </div>
                  <a href="#wizard" className="hero-cta w-full sm:w-auto">
                    <button className="w-full sm:w-auto border border-ash-stroke text-bone px-8 py-4 font-[family-name:var(--font-geist-mono)] font-bold text-xs uppercase tracking-widest rounded-[3px] hover:bg-carbon-lift transition-all">
                      {t.hero.ctaSecondary}
                    </button>
                  </a>
                </div>

                {/* Grid statistik */}
                <div className="hero-stats grid grid-cols-3 gap-4 border-t border-ash-stroke/40 pt-8">
                  <div className="flex flex-col">
                    <AnimatedNumber value={500} suffix="+" className="font-[family-name:var(--font-geist-mono)] text-xl sm:text-2xl md:text-3xl text-bone" />
                    <span className="font-[family-name:var(--font-geist-mono)] text-warm-granite text-[9px] sm:text-[10px] uppercase tracking-wider">{t.hero.stats.dailyLimit}</span>
                  </div>
                  <div className="flex flex-col border-l border-ash-stroke/40 pl-4">
                    <AnimatedNumber value={0} suffix="%" className="font-[family-name:var(--font-geist-mono)] text-xl sm:text-2xl md:text-3xl text-bone" />
                    <span className="font-[family-name:var(--font-geist-mono)] text-warm-granite text-[9px] sm:text-[10px] uppercase tracking-wider">{t.hero.stats.attachmentError}</span>
                  </div>
                  <div className="flex flex-col border-l border-ash-stroke/40 pl-4">
                    <AnimatedNumber value={99.8} decimals={1} suffix="%" className="font-[family-name:var(--font-geist-mono)] text-xl sm:text-2xl md:text-3xl text-bone" />
                    <span className="font-[family-name:var(--font-geist-mono)] text-warm-granite text-[9px] sm:text-[10px] uppercase tracking-wider">DELIVERY SPEED</span>
                  </div>
                </div>
              </div>

              <div className="hero-mockup lg:col-span-4 relative">
                <Spotlight className="grain-overlay w-full aspect-square bg-carbon-lift border border-ash-stroke p-6 rounded-xl overflow-hidden group flex flex-col justify-between">
                  <div className="relative z-10 flex justify-between items-start">
                    <div className="bg-obsidian-canvas p-2 border border-ash-stroke rounded">
                      <Icon name="mail" className="text-signal-orange" size="md" />
                    </div>
                    <span className="font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-widest text-warm-granite">{t.hero.mockup.encryption}</span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-[family-name:var(--font-geist-mono)] text-warm-granite uppercase tracking-wider">SYSTEM_MESSAGES</span>
                      <span className="font-[family-name:var(--font-geist-mono)] text-metric-green flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-metric-green animate-status-pulse" aria-hidden="true" />
                        ONLINE
                      </span>
                    </div>
                    <div className="p-3 bg-obsidian-canvas border border-ash-stroke rounded font-[family-name:var(--font-geist-mono)] text-[10px] space-y-2">
                      <TerminalStream
                        loop
                        lines={[
                          { msg: "INITIALIZING BULK SERVICE...", tone: "granite" },
                          { msg: "OAUTH SECURE MESH CONNECTED", tone: "green" },
                          { msg: "DISPATCHING BATCH #2918...", tone: "bone" },
                          { msg: "QUEUE_ENGINE: 45 JOBS OK", tone: "green" },
                          { msg: "SMART_VARIABLE: {{company}}", tone: "orange" },
                          { msg: "DISPATCHING BATCH #2919...", tone: "bone" },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="h-2 w-full bg-ash-stroke overflow-hidden rounded-full">
                      <div data-progress="75%" className="h-full bg-metric-green w-[75%]"></div>
                    </div>
                    <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-warm-granite block uppercase tracking-wider">{t.hero.mockup.batchProgress}</span>
                  </div>
                </Spotlight>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Problem Section ─── */}
        <section className="bg-carbon-lift py-16 md:py-24 border-y border-ash-stroke">
          <div className="max-w-[1200px] mx-auto px-4 md:px-10">
            <div data-reveal className="text-center mb-12 md:mb-16">
              <span className="font-[family-name:var(--font-geist-mono)] text-signal-orange mb-2 block uppercase tracking-widest text-xs">{t.problem.tag}</span>
              <h2 className="font-[family-name:var(--font-geist-sans)] text-2xl sm:text-3xl md:text-4xl text-bone uppercase tracking-tight">{t.problem.title}</h2>
            </div>
            <div data-stagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {t.problem.cards.map((card, i) => {
                const icons = ["content_copy", "location_searching", "folder_managed"]
                return (
                  <div key={i} className="p-6 md:p-8 border border-ash-stroke bg-obsidian-canvas group hover:border-bone transition-all duration-300 rounded-[10px] flex flex-col justify-between min-h-[220px] hover:-translate-y-1.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
                    <div className="mb-6">
                      <Icon name={icons[i]} size="xl" className="text-warm-granite group-hover:text-bone transition-colors group-hover:animate-status-pulse" />
                    </div>
                    <div>
                      <h3 className="font-[family-name:var(--font-geist-sans)] text-lg font-bold text-bone mb-2">{card.title}</h3>
                      <p className="font-[family-name:var(--font-geist-sans)] text-sm text-warm-granite leading-relaxed">{card.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── Core Feature: Batch Lamaran Wizard ─── */}
        <section id="wizard" className="py-16 md:py-24 max-w-[1200px] mx-auto px-4 md:px-10">
          <div data-reveal className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div className="max-w-xl">
              <span className="font-[family-name:var(--font-geist-mono)] text-metric-green mb-2 block uppercase tracking-widest text-xs">{t.wizard.tag}</span>
              <h2 className="font-[family-name:var(--font-geist-sans)] text-2xl sm:text-3xl md:text-4xl text-bone uppercase tracking-tight">{t.wizard.title}</h2>
              <p className="text-warm-granite font-[family-name:var(--font-geist-sans)] text-sm mt-3 leading-relaxed">{t.wizard.desc}</p>
            </div>
            <div className="flex gap-2">
              {[0, 1, 2].map((dot) => (
                <div key={dot} className={`w-3 h-3 rounded-full ${dot === 0 ? "bg-bone" : "bg-ash-stroke"} twinkle`} style={{ animationDelay: `${dot * 0.4}s` }}></div>
              ))}
            </div>
          </div>

          <div data-reveal className="bg-carbon-lift border border-ash-stroke rounded-xl p-4 md:p-8 shadow-2xl overflow-hidden relative">
            {/* Dashboard Mockup Header */}
            <div className="flex items-center justify-between border-b border-ash-stroke pb-4 mb-6">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-error-container"></div>
                <div className="w-3 h-3 rounded-full bg-signal-orange"></div>
                <div className="w-3 h-3 rounded-full bg-metric-green"></div>
              </div>
              <div className="font-[family-name:var(--font-geist-mono)] text-[10px] sm:text-xs text-warm-granite bg-obsidian-canvas px-4 py-1 rounded-sm border border-ash-stroke tracking-wide">
                app.pakemail.io/batch/create-wizard
              </div>
              <div className="flex items-center gap-2">
                <Icon name="refresh" className="text-sm text-warm-granite cursor-pointer group-hover:text-bone transition-colors" />
                <Icon name="more_vert" className="text-sm text-warm-granite cursor-pointer" />
              </div>
            </div>

            {/* Wizard Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Nav */}
              <div className="col-span-1 border-b lg:border-b-0 lg:border-r border-ash-stroke pb-6 lg:pb-0 lg:pr-6 space-y-1">
                {t.wizard.steps.map((step, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className={`w-full text-left p-3 hover:bg-obsidian-canvas transition-colors rounded-[4px] flex items-center justify-between ${activeStep === i ? "bg-obsidian-canvas border-l-2 border-bone text-bone font-bold" : "text-warm-granite"
                      }`}
                  >
                    <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-wider">{step}</span>
                    {i < activeStep && <Icon name="check_circle" className="text-metric-green text-sm" />}
                  </button>
                ))}
              </div>

              {/* Right Content Area */}
              <div className="col-span-1 lg:col-span-3 space-y-6 px-0 lg:px-6 flex flex-col justify-between min-h-[350px]">
                <div className="space-y-6">
                  <div className="wizard-step flex justify-between items-center">
                    <h4 className="font-[family-name:var(--font-geist-sans)] text-lg md:text-xl font-medium text-bone">
                      {t.wizard.stepTitle[activeStep]}
                    </h4>
                    <span className="font-[family-name:var(--font-geist-mono)] text-[9px] text-metric-green bg-metric-green/10 px-2.5 py-1 rounded-sm uppercase tracking-widest font-black">
                      STEP_0{activeStep + 1}_ACTIVE
                    </span>
                  </div>

                  {/* Step 1: Nama Batch */}
                  {activeStep === 0 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="font-[family-name:var(--font-geist-mono)] text-[10px] text-warm-granite uppercase tracking-wider">{t.wizard.fields.batchName}</label>
                        <input
                          className="w-full bg-obsidian-canvas border border-ash-stroke p-3 font-[family-name:var(--font-geist-mono)] text-xs text-bone focus:border-bone transition-colors outline-none rounded-[3px]"
                          type="text"
                          defaultValue="Operator Produksi - Kawasan MM2100"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="font-[family-name:var(--font-geist-mono)] text-[10px] text-warm-granite uppercase tracking-wider">{t.wizard.fields.batchDesc}</label>
                        <textarea
                          className="w-full bg-obsidian-canvas border border-ash-stroke p-3 font-[family-name:var(--font-geist-mono)] text-xs text-bone focus:border-bone transition-colors outline-none h-24 rounded-[3px] resize-none"
                          placeholder={t.wizard.fields.placeholderDesc}
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 2: Akun Email */}
                  {activeStep === 1 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="font-[family-name:var(--font-geist-mono)] text-[10px] text-warm-granite uppercase tracking-wider">{t.wizard.fields.accountLabel}</label>
                        <select className="w-full bg-obsidian-canvas border border-ash-stroke p-3 font-[family-name:var(--font-geist-mono)] text-xs text-bone focus:border-bone transition-colors outline-none rounded-[3px] appearance-none">
                          <option>pribadi.utama@gmail.com (Default - OAuth)</option>
                          <option>kerja.sampingan@gmail.com</option>
                        </select>
                      </div>
                      <div className="p-4 bg-obsidian-canvas border border-ash-stroke rounded-[3px] flex items-center gap-3">
                        <StatusPulse color="green" />
                        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase text-metric-green tracking-wider">OAUTH_TOKEN_STATUS: VALID</span>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Template */}
                  {activeStep === 2 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="font-[family-name:var(--font-geist-mono)] text-[10px] text-warm-granite uppercase tracking-wider">{t.wizard.fields.templateLabel}</label>
                        <select className="w-full bg-obsidian-canvas border border-ash-stroke p-3 font-[family-name:var(--font-geist-mono)] text-xs text-bone focus:border-bone transition-colors outline-none rounded-[3px] appearance-none">
                          <option>Standard_CV_Ref - Surat Lamaran Umum</option>
                          <option>Modern_Portfolio_Ref - Fokus Desain</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-obsidian-canvas border border-ash-stroke rounded-[3px] font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-wider">
                          <p className="text-warm-granite">MAPPED_VARIABLE_1</p>
                          <p className="text-bone font-black mt-1">`{"{{company}}`"}</p>
                        </div>
                        <div className="p-3 bg-obsidian-canvas border border-ash-stroke rounded-[3px] font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-wider">
                          <p className="text-warm-granite">MAPPED_VARIABLE_2</p>
                          <p className="text-bone font-black mt-1">`{"{{position}}`"}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Dokumen */}
                  {activeStep === 3 && (
                    <div className="space-y-4">
                      <label className="font-[family-name:var(--font-geist-mono)] text-[10px] text-warm-granite uppercase tracking-wider block">{t.wizard.fields.docLabel}</label>
                      <div className="space-y-2">
                        {[
                          { name: "CV_Utama_2024.pdf", size: "1.2 MB", type: "PDF" },
                          { name: "Portofolio_Desain_Web.pdf", size: "8.4 MB", type: "PDF" },
                          { name: "Sertifikat_Vaksin_Lengkap.pdf", size: "540 KB", type: "PDF" }
                        ].map((file, i) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-obsidian-canvas border border-ash-stroke rounded-[3px] font-[family-name:var(--font-geist-mono)] text-xs">
                            <div className="flex items-center gap-2">
                              <Icon name="description" className="text-signal-orange" size="sm" />
                              <span className="text-bone">{file.name}</span>
                            </div>
                            <span className="text-warm-granite uppercase text-[10px]">{file.size} | {file.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 5: Perusahaan */}
                  {activeStep === 4 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="font-[family-name:var(--font-geist-mono)] text-[10px] text-warm-granite uppercase tracking-wider">{t.wizard.fields.companyLabel}</label>
                        <div className="w-full bg-obsidian-canvas border border-ash-stroke border-dashed p-6 rounded-[3px] flex flex-col items-center justify-center text-center">
                          <Icon name="cloud_upload" className="text-warm-granite mb-2" size="lg" />
                          <span className="font-[family-name:var(--font-geist-sans)] text-xs text-bone mb-1">Upload CSV or Drag & Drop</span>
                          <span className="font-[family-name:var(--font-geist-mono)] text-[9px] text-warm-granite uppercase">MAX 50MB</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 6: Jadwal */}
                  {activeStep === 5 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="font-[family-name:var(--font-geist-mono)] text-[10px] text-warm-granite uppercase tracking-wider">{t.wizard.fields.scheduleLabel}</label>
                        <select className="w-full bg-obsidian-canvas border border-ash-stroke p-3 font-[family-name:var(--font-geist-mono)] text-xs text-bone focus:border-bone transition-colors outline-none rounded-[3px] appearance-none">
                          <option>45 detik (Direkomendasikan)</option>
                          <option>90 detik (Lebih Aman)</option>
                          <option>120 detik</option>
                        </select>
                      </div>
                      <div className="p-3 bg-obsidian-canvas border border-ash-stroke rounded-[3px] font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-wider space-y-1">
                        <p className="text-signal-orange">⚠️ ESTIMASI DURASI: 34 MENIT</p>
                        <p className="text-warm-granite">MENGHINDARI LIMIT SPAM GMAIL SECARA OTOMATIS</p>
                      </div>
                    </div>
                  )}

                  {/* Step 7: Preview */}
                  {activeStep === 6 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 border border-ash-stroke bg-obsidian-canvas rounded-[3px]">
                          <p className="font-[family-name:var(--font-geist-mono)] text-[9px] text-warm-granite mb-1 uppercase">GMAIL_ACCOUNT</p>
                          <p className="font-[family-name:var(--font-geist-mono)] text-xs text-bone">pribadi@gmail.com</p>
                        </div>
                        <div className="p-3 border border-ash-stroke bg-obsidian-canvas rounded-[3px]">
                          <p className="font-[family-name:var(--font-geist-mono)] text-[9px] text-warm-granite mb-1 uppercase">TEMPLATE_ID</p>
                          <p className="font-[family-name:var(--font-geist-mono)] text-xs text-bone">Standard_CV_Ref</p>
                        </div>
                        <div className="p-3 border border-ash-stroke bg-obsidian-canvas rounded-[3px]">
                          <p className="font-[family-name:var(--font-geist-mono)] text-[9px] text-warm-granite mb-1 uppercase">DOCUMENTS</p>
                          <p className="font-[family-name:var(--font-geist-mono)] text-xs text-bone">3 Files Attached</p>
                        </div>
                      </div>
                      <div className="p-4 bg-obsidian-canvas border border-ash-stroke rounded-[3px] flex items-center justify-between font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-wider">
                        <span className="text-warm-granite">ESTIMASI TOTAL PENERIMA: 45 PERUSAHAAN</span>
                        <span className="text-metric-green">OK TO SEND</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-ash-stroke/40">
                  <button
                    onClick={handleNextStep}
                    className="bg-bone text-ink-black px-6 py-2.5 font-[family-name:var(--font-geist-mono)] font-bold text-xs uppercase tracking-widest rounded-sm hover:scale-105 transition-transform"
                  >
                    {[
                      t.wizard.fields.nextBtn,
                      t.wizard.fields.nextAccount,
                      t.wizard.fields.nextTemplate,
                      t.wizard.fields.nextDoc,
                      t.wizard.fields.nextCompany,
                      t.wizard.fields.nextSchedule,
                      t.wizard.fields.nextPreview,
                    ][activeStep]}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Feature Grid Section (Bento Grid) ─── */}
        <section id="features" className="py-16 md:py-24 bg-obsidian-canvas max-w-[1200px] mx-auto px-4 md:px-10">
          <div data-stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Multi-Account Auth */}
            <Spotlight className="lg:col-span-2 group rounded-[10px] border border-ash-stroke">
              <div className="p-8 bg-carbon-lift relative overflow-hidden h-full">
                <div className="relative z-10">
                  <Icon name="account_tree" size="xl" className="text-bone mb-6" />
                  <h3 className="font-[family-name:var(--font-geist-sans)] text-xl font-bold text-bone mb-3 uppercase tracking-tight">
                    {t.bento.auth.title}
                  </h3>
                  <p className="text-warm-granite font-[family-name:var(--font-geist-sans)] text-sm max-w-md leading-relaxed">
                    {t.bento.auth.desc}
                  </p>
                </div>
                <div className="absolute right-[-20px] bottom-[-20px] p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity select-none pointer-events-none">
                  <Icon name="verified_user" className="text-[180px]" />
                </div>
              </div>
            </Spotlight>

            {/* Doc Library */}
            <Spotlight className="p-8 border border-ash-stroke bg-obsidian-canvas hover:bg-carbon-lift transition-all rounded-[10px]">
              <div className="flex flex-col justify-between h-full">
                <div>
                  <Icon name="library_books" size="xl" className="text-signal-orange mb-6" />
                  <h3 className="font-[family-name:var(--font-geist-sans)] text-xl font-bold text-bone mb-3 uppercase tracking-tight">
                    {t.bento.library.title}
                  </h3>
                  <p className="text-warm-granite font-[family-name:var(--font-geist-sans)] text-sm leading-relaxed">
                    {t.bento.library.desc}
                  </p>
                </div>
              </div>
            </Spotlight>

            {/* Smart Variable */}
            <Spotlight className="p-8 border border-[var(--color-ash-stroke)] bg-obsidian-canvas hover:bg-carbon-lift transition-all rounded-[10px]">
              <div className="flex flex-col justify-between h-full">
                <div>
                  <Icon name="terminal" size="xl" className="text-metric-green mb-6" />
                  <h3 className="font-[family-name:var(--font-geist-sans)] text-xl font-bold text-bone mb-3 uppercase tracking-tight">
                    {t.bento.variable.title}
                  </h3>
                  <p className="text-warm-granite font-[family-name:var(--font-geist-sans)] text-sm leading-relaxed">
                    {t.bento.variable.desc}
                  </p>
                </div>
              </div>
            </Spotlight>

            {/* Intelligent Scheduler */}
            <Spotlight className="lg:col-span-2 group rounded-[10px]" intensity={0.1}>
              <div className="p-8 bg-bone text-ink-black relative overflow-hidden flex flex-col justify-between h-full">
                <div className="relative z-10">
                  <Icon name="schedule" size="xl" className="text-ink-black mb-6" />
                  <h3 className="font-[family-name:var(--font-geist-sans)] text-xl font-bold text-ink-black mb-3 uppercase tracking-tight">
                    {t.bento.scheduler.title}
                  </h3>
                  <p className="text-ink-black/80 font-[family-name:var(--font-geist-sans)] text-sm max-w-md leading-relaxed mb-6">
                    {t.bento.scheduler.desc}
                  </p>
                  <button className="border-2 border-ink-black px-6 py-2.5 font-[family-name:var(--font-geist-mono)] font-bold text-xs hover:bg-ink-black hover:text-bone transition-all rounded-[3px]">
                    {t.bento.scheduler.btn}
                  </button>
                </div>
              </div>
            </Spotlight>
          </div>
        </section>

        {/* ─── Final CTA Section ─── */}
        <section id="pricing" className="py-16 md:py-24 max-w-[1200px] mx-auto px-4 md:px-10">
          <div data-reveal className="bg-bone text-ink-black p-8 md:p-16 rounded-xl flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none overflow-hidden">
              <p className="animated-neon-text font-[family-name:var(--font-geist-sans)] text-[120px] font-black leading-none break-all">
                PAKE MAIL PAKE MAIL PAKE MAIL
              </p>
            </div>
            <div className="relative z-10 max-w-2xl flex flex-col items-center">
              <h2 className="font-[family-name:var(--font-geist-sans)] text-3xl sm:text-4xl md:text-5xl font-black text-ink-black mb-6 leading-none uppercase tracking-tighter">
                {t.cta.title} <span className="underline underline-offset-8 decoration-4 decoration-signal-orange block md:inline">{t.cta.titleHighlight}</span>
              </h2>
              <p className="text-ink-black/80 font-[family-name:var(--font-geist-sans)] text-sm md:text-base mb-10 max-w-lg leading-relaxed">
                {t.cta.desc}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
                <Magnetic strength={20} className="w-full sm:w-auto">
                  <Link href="/register" className="w-full sm:w-auto">
                    <button className="w-full sm:w-auto bg-obsidian-canvas text-bone px-8 py-4 font-[family-name:var(--font-geist-mono)] font-bold text-xs uppercase tracking-widest rounded-[3px] hover:scale-95 transition-transform flex items-center justify-center gap-2 hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                      {t.cta.btnPrimary}
                      <Icon name="rocket_launch" size="sm" />
                    </button>
                  </Link>
                </Magnetic>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-ash-stroke bg-obsidian-canvas mt-12">
        <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-12 md:py-16 grid grid-cols-1 md:grid-cols-4 gap-12 w-full">
          <div className="md:col-span-2 space-y-4">
            <div className="font-[family-name:var(--font-geist-sans)] text-xl md:text-2xl font-black text-bone uppercase tracking-tighter">
              Pake Mail
            </div>
            <p className="text-warm-granite font-[family-name:var(--font-geist-mono)] text-[10px] md:text-xs max-w-xs leading-relaxed uppercase tracking-wider">
              {t.footer.desc}
            </p>
            <div className="flex gap-4">
              <a
                className="material-symbols-outlined text-warm-granite hover:text-bone cursor-pointer transition-colors"
                href="https://zardryn.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Website"
              >
                public
              </a>
              <a
                className="material-symbols-outlined text-warm-granite hover:text-bone cursor-pointer transition-colors"
                href="mailto:azharadrian208@gmail.com"
                aria-label="Email"
              >
                mail
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="font-[family-name:var(--font-geist-mono)] text-bone text-[10px] tracking-widest font-black uppercase">{t.footer.resources}</span>
            <button
              onClick={() => setOpenDoc(FOOTER_DOCS.documentation)}
              className="text-left font-[family-name:var(--font-geist-mono)] text-xs text-warm-granite transition-colors hover:text-bone"
            >
              Documentation
            </button>
            <button
              onClick={() => setOpenDoc(FOOTER_DOCS.security)}
              className="text-left font-[family-name:var(--font-geist-mono)] text-xs text-warm-granite transition-colors hover:text-bone"
            >
              Security
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <span className="font-[family-name:var(--font-geist-mono)] text-bone text-[10px] tracking-widest font-black uppercase">{t.footer.legal}</span>
            <button
              onClick={() => setOpenDoc(FOOTER_DOCS.terms)}
              className="text-left font-[family-name:var(--font-geist-mono)] text-xs text-warm-granite transition-colors hover:text-bone"
            >
              Terms of Service
            </button>
            <button
              onClick={() => setOpenDoc(FOOTER_DOCS.privacy)}
              className="text-left font-[family-name:var(--font-geist-mono)] text-xs text-warm-granite transition-colors hover:text-bone"
            >
              Privacy Policy
            </button>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-6 border-t border-ash-stroke/30 flex justify-between items-center w-full">
          <span className="font-[family-name:var(--font-geist-mono)] text-[9px] text-warm-granite uppercase tracking-widest">
            © 2026 PAKE MAIL.
          </span>
        </div>
      </footer>

      <DocModal open={openDoc !== null} onClose={() => setOpenDoc(null)} data={openDoc ?? FOOTER_DOCS.documentation} />
    </div>
  )
}
