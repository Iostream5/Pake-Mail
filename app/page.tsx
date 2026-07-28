import Link from "next/link"
import { Icon } from "@/components/ui/icon"
import { StatusPulse } from "@/components/ui/status-pulse"
import { MonoLabel } from "@/components/ui/mono-label"
import { Button } from "@/components/ui/button"

const features = [
  {
    icon: "style",
    code: "#001",
    title: "Template & Variabel",
    description: "Rancang pesan dinamis dengan mesin rendering variabel yang mendukung markup kompleks.",
  },
  {
    icon: "layers",
    code: "#002",
    title: "Batch & Jadwal",
    description: "Antrean pengiriman otomatis dengan penjadwalan presisi hingga milidetik.",
  },
  {
    icon: "monitoring",
    code: "#003",
    title: "Pantau Status",
    description: "Telemetri real-time untuk setiap paket data yang dikirimkan. Visibilitas penuh pada endpoint.",
  },
]

const footerLinks = {
  protokol: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Template", href: "/dashboard/templates" },
    { label: "Security", href: "#" },
  ],
  resource: [
    { label: "API Docs", href: "#" },
    { label: "Log Access", href: "#" },
    { label: "Status", href: "#" },
  ],
  legal: [
    { label: "Privacy", href: "#" },
    { label: "Compliance", href: "#" },
  ],
}

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-obsidian-canvas text-bone">
      {/* ─── Top App Bar ─── */}
      <header className="fixed top-0 left-0 w-full z-50 flex h-16 items-center justify-between border-b border-ash-stroke bg-obsidian-canvas px-4 md:px-10">
        <div className="flex items-center gap-4">
          <Icon name="menu" className="text-bone md:hidden" />
          <span className="font-[family-name:var(--font-geist-sans)] text-2xl font-normal text-bone uppercase tracking-tighter">
            Pake Mail
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-carbon-lift border border-ash-stroke" />
        </div>
      </header>

      <main className="pt-16">
        {/* ─── Hero Section ─── */}
        <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-4 py-20 text-center">
          {/* Status badge */}
          <div className="relative z-10 mb-10 inline-flex items-center gap-2 rounded-full border border-ash-stroke bg-carbon-lift px-4 py-1.5">
            <StatusPulse color="orange" />
            <MonoLabel>System Ready: Protocol 2.0</MonoLabel>
          </div>

          {/* Title */}
          <h1 className="relative z-10 font-[family-name:var(--font-geist-sans)] text-6xl sm:text-7xl md:text-8xl font-normal tracking-[-2.88px] leading-none mb-4">
            Pake Mail
          </h1>

          {/* Subtitle */}
          <p className="relative z-10 mx-auto max-w-2xl text-lg md:text-2xl text-warm-granite leading-relaxed mb-10 tracking-tight">
            Operasi pengiriman pesan berkinerja tinggi. Otomasi batch, manajemen template presisi, dan pantauan status real-time.
          </p>

          {/* CTA Buttons */}
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4">
            <Link href="/login">
              <Button size="lg" variant="primary" className="w-full sm:w-auto px-12 py-4 font-bold">
                Mulai Sekarang
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="ghost" className="w-full sm:w-auto px-12 py-4">
                Daftar
              </Button>
            </Link>
          </div>

          {/* Terminal decorative line */}
          <div className="absolute bottom-0 left-0 w-full h-px bg-ash-stroke" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-0.5 bg-bone" />
        </section>

        {/* ─── Features Section — Bone Cards ─── */}
        <section className="py-24 mx-auto max-w-[1200px] px-4">
          {/* Section header */}
          <div className="mb-16 flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="max-w-xl">
              <h2 className="font-[family-name:var(--font-geist-sans)] text-3xl md:text-[44px] leading-tight tracking-tight mb-4">
                Core Logistics
              </h2>
              <p className="text-warm-granite">
                Infrastruktur pengiriman yang dirancang untuk efisiensi maksimal tanpa kompromi visual.
              </p>
            </div>
            <div className="border-l border-ash-stroke pl-4">
              <MonoLabel as="div">
                MODULE_VERSION: 0.1.4
                <br />
                STABILITY: OPTIMAL
              </MonoLabel>
            </div>
          </div>

          {/* Feature cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.code}
                className="grain-overlay flex min-h-[320px] flex-col rounded-[10px] bg-bone p-10 text-ink-black transition-transform duration-300 hover:scale-[1.01]"
              >
                <div className="flex items-start justify-between mb-16">
                  <Icon name={feature.icon} size="xl" className="opacity-80" />
                  <MonoLabel color="ink-black" className="opacity-50">
                    {feature.code}
                  </MonoLabel>
                </div>
                <div className="mt-auto">
                  <h3 className="font-[family-name:var(--font-geist-sans)] text-2xl font-bold tracking-tight mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-sm opacity-80 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Dashboard Preview Section — Bento Grid ─── */}
        <section className="pb-24 mx-auto max-w-[1200px] px-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Large panel — Live Feed */}
            <div className="col-span-12 md:col-span-8 rounded-lg border border-ash-stroke bg-carbon-lift p-8 overflow-hidden relative group">
              <div className="flex items-center justify-between mb-8">
                <div className="flex gap-3">
                  <div className="h-3 w-3 rounded-full bg-metric-green" />
                  <div className="h-3 w-3 rounded-full bg-warm-granite" />
                  <div className="h-3 w-3 rounded-full bg-warm-granite" />
                </div>
                <MonoLabel>LIVE_FEED.SYS</MonoLabel>
              </div>
              <div className="space-y-4 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                {[
                  { status: "200 OK", color: "text-metric-green", batch: "BATCH_ID: 9928-X", time: "T: 0.02ms" },
                  { status: "200 OK", color: "text-metric-green", batch: "BATCH_ID: 9928-Y", time: "T: 0.04ms" },
                  { status: "408 TO", color: "text-signal-orange", batch: "RETRY_ATTEMPT_1", time: "T: 5.00ms" },
                ].map((log, i) => (
                  <div key={i} className="flex justify-between border-b border-ash-stroke pb-2 font-[family-name:var(--font-geist-mono)] text-xs">
                    <span className={log.color}>{log.status}</span>
                    <span>{log.batch}</span>
                    <span>{log.time}</span>
                  </div>
                ))}
              </div>
              {/* Placeholder image area */}
              <div className="mt-10 h-48 rounded-lg border border-ash-stroke bg-obsidian-canvas flex items-center justify-center">
                <MonoLabel>CORE SIGNAL MESH NETWORK</MonoLabel>
              </div>
            </div>

            {/* Side panel — Bento */}
            <div className="col-span-12 md:col-span-4 flex flex-col gap-4">
              {/* Inbound Traffic */}
              <div className="flex-1 rounded-lg border border-ash-stroke bg-carbon-lift p-6">
                <MonoLabel className="mb-3 block">Inbound Traffic</MonoLabel>
                <div className="font-[family-name:var(--font-geist-sans)] text-3xl text-bone">
                  1.2M{" "}
                  <span className="text-sm font-[family-name:var(--font-geist-mono)] text-warm-granite">RPM</span>
                </div>
                <div className="mt-4 h-1 w-full bg-obsidian-canvas rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-metric-green" />
                </div>
              </div>

              {/* Active Recipients — Bone card */}
              <div className="flex-1 grain-overlay rounded-lg bg-bone p-6 text-ink-black">
                <MonoLabel color="ink-black" className="mb-3 block opacity-50">
                  Active Recipients
                </MonoLabel>
                <div className="font-[family-name:var(--font-geist-sans)] text-3xl font-bold">
                  28,402
                </div>
                <div className="mt-4 flex -space-x-2">
                  {["bg-carbon-lift", "bg-warm-granite", "bg-ash-stroke"].map((bg, i) => (
                    <div key={i} className={`h-8 w-8 rounded-full border-2 border-bone ${bg}`} />
                  ))}
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-bone bg-obsidian-canvas text-[10px] font-bold text-bone">
                    +42
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── CTA Section ─── */}
        <section className="border-y border-ash-stroke bg-carbon-lift py-20 text-center px-4">
          <h2 className="font-[family-name:var(--font-geist-sans)] text-3xl md:text-[44px] leading-tight tracking-tight mb-8">
            Ready to Deploy?
          </h2>
          <p className="mx-auto max-w-xl text-warm-granite mb-8">
            Tingkatkan presisi operasional mail-server Anda sekarang dengan Pake Mail.
          </p>
          <Link href="/login">
            <Button size="lg" variant="primary" className="px-12 py-4 font-bold">
              Inisiasi Sistem
            </Button>
          </Link>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="py-20 mx-auto max-w-[1200px] px-4 flex flex-col md:flex-row justify-between items-start gap-16 w-full">
        <div className="space-y-4">
          <div className="font-[family-name:var(--font-geist-sans)] text-2xl text-bone uppercase tracking-tighter">
            Pake Mail
          </div>
          <MonoLabel as="p" className="max-w-xs leading-relaxed">
            Sistem Pengoperasian Email Terpadu.
            <br />
            Terminal War Room untuk data.
            <br />
            © 2024 PAKE_SYSTEMS.LLC
          </MonoLabel>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section} className="space-y-4">
              <MonoLabel size="sm" color="bone" className="font-bold block">
                {section}
              </MonoLabel>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-widest text-warm-granite hover:text-bone transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </footer>
    </div>
  )
}
