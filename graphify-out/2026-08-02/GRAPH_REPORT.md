# Graph Report - pake-mail  (2026-08-02)

## Corpus Check
- 139 files · ~88,565 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 813 nodes · 1568 edges · 55 communities (45 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `145325e7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- requireUserId
- dependencies
- Pake Mail — E2E User Flow Dokumentasi
- devDependencies
- auth.ts
- compilerOptions
- Product Requirements Document (PRD)
- mono-label.tsx
- Environment & Requirements Configuration — Pake Mail V1
- Product Requirements Document (PRD)
- dashboard-content.tsx
- Audit V1 — Pake Mail vs PRD v1
- cn
- storage.ts
- profile-form.tsx
- Work Plan — Pake Mail V2
- batch-wizard.tsx
- Project Phasing — Pake Mail V1
- document-list.tsx
- template-list.tsx
- recipient-list.tsx
- Pake Mail — UI Design Reference untuk Figma
- 13. UI PRIMITIVES (Design System)
- DESIGN.md
- 10. BATCH DETAIL PAGE (`/dashboard/batches/[id]`)
- 3. DASHBOARD LAYOUT (Shell — Semua halaman dashboard)
- 5. PROFILE PAGE (`/dashboard/profile`)
- 7. TEMPLATES PAGE (`/dashboard/templates`)
- layout.tsx
- 11. BATCH WIZARD (`/dashboard/batches/new`)
- 9. BATCHES PAGE (`/dashboard/batches`)
- page.tsx
- 12. EMAIL ACCOUNTS PAGE (`/dashboard/email-accounts`)
- 6. DOCUMENTS PAGE (`/dashboard/documents`)
- 8. RECIPIENTS PAGE (`/dashboard/recipients`)
- proxy.ts
- opencode.json
- README.md
- This is NOT the Next.js you know
- 2. HALAMAN LOGIN & REGISTER (`/login`, `/register`)
- graphify.js
- eslint.config.mjs
- AuthError
- env.ts
- next.config.ts
- postcss.config.mjs
- { GET, POST }
- page.tsx
- 1. LANDING PAGE (Halaman Depan — `/`)
- batch-detail.tsx
- notifications.ts
- 1. LANDING PAGE (Halaman Depan — `/`)

## God Nodes (most connected - your core abstractions)
1. `requireUserId()` - 97 edges
2. `handleApi()` - 96 edges
3. `apiSuccess()` - 93 edges
4. `apiError()` - 73 edges
5. `cn()` - 34 edges
6. `Icon()` - 21 edges
7. `compilerOptions` - 16 edges
8. `Product Requirements Document (PRD)` - 16 edges
9. `Pake Mail — UI Design Reference untuk Figma` - 16 edges
10. `main()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `main()` --references--> `worker`  [EXTRACTED]
  workers/index.ts → package.json
- `GET()` --calls--> `requireUserId()`  [EXTRACTED]
  app/api/email-accounts/callback/route.ts → lib/api-helpers.ts
- `POST()` --calls--> `apiError()`  [EXTRACTED]
  app/api/email-accounts/route.ts → lib/api-helpers.ts
- `POST()` --calls--> `apiSuccess()`  [EXTRACTED]
  app/api/email-accounts/route.ts → lib/api-helpers.ts
- `POST()` --calls--> `handleApi()`  [EXTRACTED]
  app/api/email-accounts/route.ts → lib/api-helpers.ts

## Import Cycles
- None detected.

## Communities (55 total, 10 thin omitted)

### Community 0 - "requireUserId"
Cohesion: 0.07
Nodes (81): POST(), GET(), POST(), POST(), DELETE(), POST(), POST(), DELETE() (+73 more)

### Community 1 - "dependencies"
Cohesion: 0.05
Nodes (43): @auth/prisma-adapter, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bullmq, clsx, googleapis, @hookform/resolvers, ioredis (+35 more)

### Community 2 - "Pake Mail — E2E User Flow Dokumentasi"
Cohesion: 0.05
Nodes (40): 10. Flow Update Status Lamaran, 11. Diagram Siklus Batch, 12. Diagram Alur Data Email, 1.1 Registrasi, 1.2 Login (User Existing), 1.3 Route Protection, 1. Flow Registrasi & Login, 2. Flow Dashboard (+32 more)

### Community 3 - "devDependencies"
Cohesion: 0.07
Nodes (29): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx (+21 more)

### Community 4 - "auth.ts"
Cohesion: 0.09
Nodes (22): 10.1 V3 (Preview) — Auto-Resend, 10. Roadmap Setelah V2, 1. Ringkasan Eksekutif, 2. Tujuan & Success Metrics V2, 3.1 In-Scope, 3.2 Eksplisit Out-of-Scope V2, 3. Ruang Lingkup V2, 4.1 Replies Module (+14 more)

### Community 5 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 6 - "Product Requirements Document (PRD)"
Cohesion: 0.08
Nodes (24): 10. Kebutuhan Non-Fungsional, 11. Rekomendasi Arsitektur & Tech Stack, 12. Risiko & Asumsi, 13. Roadmap Setelah V1, 14. Ringkasan Prioritas V1 (Definition of Done), 1. Ringkasan Eksekutif, 2. Latar Belakang & Masalah, 3. Target User & Persona (+16 more)

### Community 7 - "mono-label.tsx"
Cohesion: 0.21
Nodes (7): features, footerLinks, EmailAccount, EmailAccountsList(), getInitials(), Button, ButtonProps

### Community 8 - "Environment & Requirements Configuration — Pake Mail V1"
Cohesion: 0.09
Nodes (22): 10. Daftar Layanan Eksternal & Akun yang Perlu Disiapkan, 11. Ringkasan Environment Variables — Semua Variabel, 1.1 Supabase Project — Data Koneksi, 1.2 Database Tabel (via Prisma Schema), 1.3 Ringkasan Field per Tabel, 1. Database — PostgreSQL (via Supabase), 2. Redis (via Upstash / Redis Stack), 3. Object Storage — Dokumen (S3-compatible) (+14 more)

### Community 9 - "Product Requirements Document (PRD)"
Cohesion: 0.11
Nodes (18): 10. Roadmap Setelah V3, 1. Ringkasan Eksekutif, 2. Tujuan & Prinsip Desain, 3.1 In-Scope, 3.2 Eksplisit Out-of-Scope V3, 3. Ruang Lingkup V3, 4.1 Konfigurasi Threshold & Batas Resend, 4.2 Logika Trigger & Penjadwalan (+10 more)

### Community 10 - "dashboard-content.tsx"
Cohesion: 0.13
Nodes (19): DashboardStats, ActivityItem, EVENT_ICONS, RecentActivity(), RunningBatch(), RunningBatchItem, UpcomingBatchItem, UpcomingSchedule() (+11 more)

### Community 11 - "Audit V1 — Pake Mail vs PRD v1"
Cohesion: 0.10
Nodes (20): 1. Auth & Middleware, 2. Email Account (Modul 8.1), 3. Profile (Modul 8.2), 4. Document Library (Modul 8.3), 5. Template Email (Modul 8.4), 6. Recipient Management (Modul 8.5), 7. Batch Lamaran — Core Module (Modul 8.6), Audit V1 — Pake Mail vs PRD v1 (+12 more)

### Community 12 - "cn"
Cohesion: 0.11
Nodes (19): navItems, Dialog(), DialogProps, Label, LabelProps, colorClasses, MonoLabel(), MonoLabelColor (+11 more)

### Community 13 - "storage.ts"
Cohesion: 0.08
Nodes (47): GET(), POST(), categorizeError(), ERROR_PATTERNS, ErrorCategory, decrypt(), encrypt(), KEY (+39 more)

### Community 14 - "profile-form.tsx"
Cohesion: 0.09
Nodes (27): Education, emptyProfile(), Experience, Profile, ProfileForm(), ProfileLink, ExcludeEntry, ExcludeListForm() (+19 more)

### Community 15 - "Work Plan — Pake Mail V2"
Cohesion: 0.17
Nodes (11): Catatan Penting, Fase 0 — Fondasi V3, Fase 1 — Konfigurasi Threshold & Batas Resend, Fase 2 — Logika Trigger & Penjadwalan, Fase 3 — Approval Window, Fase 4 — Eksekusi Resend, Fase 5 — QA, Hardening & Beta Terbatas, Gerbang Sebelum Mulai (Bukan Fase, tapi Syarat Wajib) (+3 more)

### Community 16 - "batch-wizard.tsx"
Cohesion: 0.22
Nodes (7): BatchWizard(), DAYS, Document, EmailAccount, Recipient, STEPS, Template

### Community 17 - "Project Phasing — Pake Mail V1"
Cohesion: 0.17
Nodes (11): Catatan Penting, Fase 0 — Fondasi Proyek, Fase 1 — Autentikasi & Koneksi Email, Fase 2 — Modul Data Reusable, Fase 3 — Mesin Batch (Core Module), Fase 4 — Monitoring & Status Tracking, Fase 5 — QA, Hardening & Beta, Prinsip Urutan Pengerjaan (+3 more)

### Community 18 - "document-list.tsx"
Cohesion: 0.25
Nodes (6): CATEGORY_LABELS, CATEGORY_LIMITS, CATEGORY_OPTIONS, Document, Select, SelectProps

### Community 19 - "template-list.tsx"
Cohesion: 0.17
Nodes (11): build, builder, dockerfilePath, deploy, healthcheckPath, healthcheckTimeout, numReplicas, restartPolicyMaxRetries (+3 more)

### Community 20 - "recipient-list.tsx"
Cohesion: 0.33
Nodes (8): emptyForm, Recipient, Table, TableBody, TableCell, TableHead, TableHeader, TableRow

### Community 21 - "Pake Mail — UI Design Reference untuk Figma"
Cohesion: 0.20
Nodes (9): 14. GLOBAL / TEMA, 15. USER FLOW, 2. HALAMAN LOGIN & REGISTER (`/login`, `/register`), 4. DASHBOARD PAGE (`/dashboard`), Data / State, Komponen, Komponen, Pake Mail — UI Design Reference untuk Figma (+1 more)

### Community 22 - "13. UI PRIMITIVES (Design System)"
Cohesion: 0.20
Nodes (10): 13. UI PRIMITIVES (Design System), Badge, Button, Card, Dialog / Modal, Input, Select, Skeleton (+2 more)

### Community 23 - "DESIGN.md"
Cohesion: 0.25
Nodes (7): Brand & Style, Colors, Components, Elevation & Depth, Layout & Spacing, Shapes, Typography

### Community 24 - "10. BATCH DETAIL PAGE (`/dashboard/batches/[id]`)"
Cohesion: 0.33
Nodes (6): 10. BATCH DETAIL PAGE (`/dashboard/batches/[id]`), Action Buttons (by status), Komponen, Manual Statuses (for dropdown select), Recipient Status Colors, States

### Community 25 - "3. DASHBOARD LAYOUT (Shell — Semua halaman dashboard)"
Cohesion: 0.33
Nodes (6): 3. DASHBOARD LAYOUT (Shell — Semua halaman dashboard), Header / Navbar, Sidebar, Sidebar Nav Items, Sidebar States, Struktur Layout

### Community 26 - "5. PROFILE PAGE (`/dashboard/profile`)"
Cohesion: 0.33
Nodes (6): 5. PROFILE PAGE (`/dashboard/profile`), Data Fields, Education Item, Experience Item, Komponen, States

### Community 27 - "7. TEMPLATES PAGE (`/dashboard/templates`)"
Cohesion: 0.33
Nodes (6): 7. TEMPLATES PAGE (`/dashboard/templates`), Komponen, States, Template Card Actions, Template Card Data, Template Variable Hints

### Community 28 - "layout.tsx"
Cohesion: 0.40
Nodes (3): geistSans, jetBrainsMono, metadata

### Community 29 - "11. BATCH WIZARD (`/dashboard/batches/new`)"
Cohesion: 0.40
Nodes (5): 11. BATCH WIZARD (`/dashboard/batches/new`), Komponen, Schedule Data, States, Steps

### Community 30 - "9. BATCHES PAGE (`/dashboard/batches`)"
Cohesion: 0.40
Nodes (5): 9. BATCHES PAGE (`/dashboard/batches`), Batch Card Data, Komponen, States, Status Colors

### Community 32 - "12. EMAIL ACCOUNTS PAGE (`/dashboard/email-accounts`)"
Cohesion: 0.50
Nodes (4): 12. EMAIL ACCOUNTS PAGE (`/dashboard/email-accounts`), Account Card Data, Komponen, States

### Community 33 - "6. DOCUMENTS PAGE (`/dashboard/documents`)"
Cohesion: 0.50
Nodes (4): 6. DOCUMENTS PAGE (`/dashboard/documents`), Document Card Data, Komponen, States

### Community 34 - "8. RECIPIENTS PAGE (`/dashboard/recipients`)"
Cohesion: 0.50
Nodes (4): 8. RECIPIENTS PAGE (`/dashboard/recipients`), Komponen, Recipient Item Data, States

### Community 36 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 37 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 39 - "2. HALAMAN LOGIN & REGISTER (`/login`, `/register`)"
Cohesion: 0.21
Nodes (12): AVATAR_COLORS, BatchRecipient, getAvatarColor(), getInitials(), LABEL_OPTIONS, Pagination, Reply, ReplyBatch (+4 more)

### Community 43 - "AuthError"
Cohesion: 0.18
Nodes (10): Catatan Penting, Fase 0 — Fondasi V2, Fase 1 — Replies Module (Core), Fase 2 — Fitur Independen, Fase 3 — Dashboard & Reply Rate per Template, Fase 4 — Notifikasi Sederhana, Fase 5 — QA, Hardening & Beta, Prinsip Urutan Pengerjaan (+2 more)

### Community 50 - "page.tsx"
Cohesion: 0.28
Nodes (5): LoginForm(), colorMap, StatusPulse(), StatusPulseColor, StatusPulseProps

### Community 51 - "1. LANDING PAGE (Halaman Depan — `/`)"
Cohesion: 0.05
Nodes (22): DashboardContent(), BatchDetail(), BatchDetailData, MANUAL_STATUSES, parseErrorLog(), RECIPIENT_STATUS_COLORS, STATUS_COLORS, BatchList() (+14 more)

### Community 57 - "notifications.ts"
Cohesion: 0.47
Nodes (5): createNotification(), NOTIFICATION_TITLES, NotificationType, notifyBatchCompleted(), notifyReplyDetected()

### Community 59 - "1. LANDING PAGE (Halaman Depan — `/`)"
Cohesion: 0.67
Nodes (3): 1. LANDING PAGE (Halaman Depan — `/`), Data / State, Komponen

## Knowledge Gaps
- **386 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `DashboardStats`, `CATEGORY_LIMITS`, `geistSans` (+381 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `Dialog()` connect `cn` to `dependencies`, `profile-form.tsx`, `document-list.tsx`, `1. LANDING PAGE (Halaman Depan — `/`)`, `recipient-list.tsx`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `react` connect `dependencies` to `cn`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `DashboardStats` to the rest of the system?**
  _386 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `requireUserId` be split into smaller, more focused modules?**
  _Cohesion score 0.06976134277471807 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `Pake Mail — E2E User Flow Dokumentasi` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._