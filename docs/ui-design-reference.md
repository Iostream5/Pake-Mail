# Pake Mail — UI Design Reference untuk Figma

## 1. LANDING PAGE (Halaman Depan — `/`)

### Komponen
| Elemen | Keterangan |
|--------|------------|
| **Hero Section** | Logo "Pake Mail", tagline, 2 CTA buttons |
| **Feature Cards** | 3 cards: Template & Variabel, Batch & Jadwal, Pantau Status |

### Data / State
- CTA buttons: "Mulai Sekarang" (link ke `/login`), "Daftar" (link ke `/register`)
- Feature: icon + title + deskripsi singkat

---

## 2. HALAMAN LOGIN & REGISTER (`/login`, `/register`)

### Komponen
| Elemen | Keterangan |
|--------|------------|
| **Google Sign-In Button** | Full-width button with Google logo + text |
| **Terms text** | Disclaimer hukum di bawah button |

### Data / State
- Login: "Masuk ke Pake Mail"
- Register: "Buat Akun Pake Mail"
- Redirect after login ke `/dashboard`

---

## 3. DASHBOARD LAYOUT (Shell — Semua halaman dashboard)

### Struktur Layout
```
┌─────────────────────────────────────┐
│  SIDEBAR (w-60)   │  HEADER (h-14) │
│                   ├─────────────────┤
│  Logo "Pake Mail" │  [☰] Pake Mail │
│  ───────────────  │  User Name      │
│  ▦ Dashboard      │  [Keluar]       │
│  ● Profile        │                  │
│  ■ Dokumen        │  MAIN CONTENT    │
│  ▲ Template       │  (content area)  │
│  ◆ Perusahaan     │                  │
│  ▶ Batch Lamaran  │                  │
│  ✉ Email          │                  │
│  ───────────────  │                  │
│  user@email.com   │                  │
└─────────────────────────────────────┘
```

### Sidebar
| Properti | Nilai |
|----------|-------|
| Lebar | 240px (w-60) desktop |
| Mobile | Overlay + slide from left + backdrop |
| Background | White / Zinc-950 (dark) |
| Nav items | 7 items + user info footer |

#### Sidebar Nav Items
| Icon | Label | Route |
|------|-------|-------|
| ▦ | Dashboard | `/dashboard` |
| ● | Profile | `/dashboard/profile` |
| ■ | Dokumen | `/dashboard/documents` |
| ▲ | Template | `/dashboard/templates` |
| ◆ | Perusahaan | `/dashboard/recipients` |
| ▶ | Batch Lamaran | `/dashboard/batches` |
| ✉ | Email | `/dashboard/email-accounts` |

#### Sidebar States
- **Desktop (lg+)**: static, always visible
- **Mobile (< lg)**: hidden by default, slide-in with backdrop overlay
- **Active nav**: highlighted background + text (by pathname)
- **Hover**: subtle background change

### Header / Navbar
| Elemen | Keterangan |
|--------|------------|
| Hamburger button | `lg:hidden`, hanya tampil di mobile |
| Brand text | "Pake Mail" |
| User name | `hidden sm:inline`, hanya tampil di tablet+ |
| Logout button | "Keluar" → `signOut()` |

---

## 4. DASHBOARD PAGE (`/dashboard`)

### Komponen
| Elemen | Keterangan |
|--------|------------|
| Page title | "Dashboard" |
| Welcome message | "Selamat datang, {name}!" |
| *[Kosong — belum ada widget/stat]* | Bisa ditambahkan nanti |

---

## 5. PROFILE PAGE (`/dashboard/profile`)

### Komponen
| Elemen | Keterangan |
|--------|------------|
| **Personal Info Card** | Form input 6 fields (2 kolom desktop, 1 kolom mobile) |
| **Education Card** | Daftar pendidikan + Add button + inline form |
| **Experience Card** | Daftar pengalaman + Add button + inline form |

### Data Fields
| Field | Type | Label |
|-------|------|-------|
| fullName | text | Nama Lengkap |
| phone | text | Nomor Telepon |
| email | email | Email |
| linkedinUrl | url | LinkedIn URL |
| portfolioUrl | url | Portfolio URL |
| address | text | Alamat |

### Education Item
| Field | Type |
|-------|------|
| institution | text |
| degree | text (optional) |
| major | text (optional) |
| startYear | number (optional) |
| endYear | number (optional) |

### Experience Item
| Field | Type |
|-------|------|
| company | text |
| position | text |
| startDate | date (optional) |
| endDate | date (optional) |
| description | textarea (optional) |

### States
- **Loading**: 3 skeleton cards with pulsing bars
- **Empty education**: "Belum ada data pendidikan."
- **Empty experience**: "Belum ada data pengalaman."
- **Success**: green toast "Profil berhasil disimpan"
- **Error**: red alert box
- **Edit mode**: inline form replaces/adds to list

---

## 6. DOCUMENTS PAGE (`/dashboard/documents`)

### Komponen
| Elemen | Keterangan |
|--------|------------|
| **Category Tabs** | Horizontal scroll tabs: Semua, CV, Portfolio, Ijazah, SKCK, Transkrip, Lainnya |
| **Upload Button** | "Upload Dokumen" |
| **Document Grid** | 1/2/3 kolom responsive |
| **Document Card** | Avatar initial, name, category badge, size, version, date |
| **Delete Button** | ✕ ghost button |
| **Upload Dialog** | Modal: name input, category select, file input, cancel + submit |

### Document Card Data
| Field | Contoh |
|-------|--------|
| Initial | Huruf pertama nama (contoh: "C") |
| Name | "CV_April_2026" |
| Category Badge | "CV" (info), "PORTFOLIO" (success), etc. |
| File Size | "245 KB" or "1.2 MB" |
| Version | "v2" |
| Date | "26 Juli 2026" |

### States
- **Loading**: 6 skeleton cards (animate-pulse)
- **Empty**: Dashed border box "Belum ada dokumen. Upload dokumen pertama kamu."
- **Filtered empty**: "Tidak ada dokumen di kategori ini."
- **Upload dialog**: `Dialog` component with 3 form fields
- **Uploading**: button loading spinner

---

## 7. TEMPLATES PAGE (`/dashboard/templates`)

### Komponen
| Elemen | Keterangan |
|--------|------------|
| **Header** | Title + "Buat Template" button |
| **Favorites Section** | Grid of favorite template cards |
| **All Templates Section** | Grid of all template cards |
| **Template Card** | Name, favorite star, subject, body preview (line-clamp-2), action buttons |
| **Create/Edit Dialog** | Modal: name, subject (with variable hints), body (with variable hints), closing/signature |
| **Preview Dialog** | Modal: rendered subject + body + closing |

### Template Card Data
| Field | Contoh |
|-------|--------|
| Name | "Lamaran Frontend" |
| Subject | "Lamaran {{position}} - {{full_name}}" |
| Body | "...to {{company}}..." (truncated) |
| Closing | "Hormat saya, {{full_name}}" |
| Favorite | ★ or ☆ |

### Template Variable Hints
| Variable | Deskripsi |
|----------|-----------|
| `{{full_name}}` | Nama lengkap dari profil |
| `{{phone}}` | Nomor telepon |
| `{{email}}` | Email |
| `{{linkedin}}` | LinkedIn URL |
| `{{portfolio}}` | Portfolio URL |
| `{{company}}` | Nama perusahaan tujuan |
| `{{position}}` | Posisi yang dilamar |

### Template Card Actions
| Button | Function |
|--------|----------|
| Edit | Open edit dialog with template data |
| Preview | Open preview dialog |
| Clone | Duplicate template |
| ★/☆ | Toggle favorite |
| Hapus | Delete template |

### States
- **Loading**: 4 skeleton cards
- **Empty**: Dashed border "Belum ada template."
- **Form dialog**: create vs edit mode (title changes)
- **Preview dialog**: rendered with dummy data

---

## 8. RECIPIENTS PAGE (`/dashboard/recipients`)

### Komponen
| Elemen | Keterangan |
|--------|------------|
| **Header** | Title + action buttons (Import CSV, Export CSV, Tambah Manual) |
| **Search Input** | Search by company name or email |
| **Table (desktop)** | 6 columns: Perusahaan, Email HR, Posisi, Lokasi, Tags, [Hapus] |
| **Cards (mobile)** | Company name, email, position, location, tags, delete button |
| **Add Dialog** | Modal: company name, hr email, position, location, tags |
| **CSV Import** | Hidden file input for .csv |
| **CSV Export** | Opens `/api/recipients/export` |

### Recipient Item Data
| Field | Tipe |
|-------|------|
| companyName | text |
| hrEmail | email |
| position | text (optional) |
| location | text (optional) |
| website | text (optional) |
| source | text (optional) |
| notes | text (optional) |
| tags | comma-separated string (optional) |

### States
- **Loading**: "Memuat data..." text
- **Empty**: "Belum ada data perusahaan. Tambah manual atau import CSV."
- **Search no results**: "Tidak ada hasil pencarian."
- **Importing**: button loading state

---

## 9. BATCHES PAGE (`/dashboard/batches`)

### Komponen
| Elemen | Keterangan |
|--------|------------|
| **Header** | Title + "Create Batch" button |
| **Batch Grid** | 1/2 kolom responsive |
| **Batch Card** | Name, description, status badge, email, template, recipient count, [Start] button (if DRAFT) |

### Batch Card Data
| Field | Contoh |
|-------|--------|
| Name | "Software Engineer Q3 2026" |
| Description | optional, line-clamp-1 |
| Status Badge | DRAFT / SCHEDULED / RUNNING / PAUSED / COMPLETED / STOPPED / FAILED |
| Email | "user@gmail.com" |
| Template Name | "Lamaran Frontend" |
| Recipients | "15 recipients" |
| Start Button | Muncul hanya jika status = DRAFT |

### Status Colors
| Status | Color |
|--------|-------|
| DRAFT | Zinc |
| SCHEDULED | Blue |
| RUNNING | Green |
| PAUSED | Yellow |
| COMPLETED | Emerald |
| STOPPED | Red |
| FAILED | Red |

### States
- **Loading**: "Loading..." text
- **Empty**: Dashed border "No batches yet. Click 'Create Batch' to get started."
- **Action loading**: "Starting..." on selected card

---

## 10. BATCH DETAIL PAGE (`/dashboard/batches/[id]`)

### Komponen
| Elemen | Keterangan |
|--------|------------|
| **Header** | Batch name, status badge, description |
| **Meta Row** | Email · Template · Recipients count · Scheduled |
| **Action Buttons** | Pause / Resume / Stop (conditional based on status) |
| **Stats Grid** | 2/5 kolom: Total, Pending, Sent, Failed, Skipped |
| **Documents Section** | Wrap badges of attached documents |
| **Recipients Table/Cards** | Table desktop, cards mobile: Company, Email, Position, Status, Sent At, Status Update select |
| **Activity Log** | Scrollable list: timestamp + message |
| **Config Grid** | 1/3 kolom: Delay, Active Hours, Active Days, Retry, Auto-Stop, Created |

### Recipient Status Colors
| Status | Color |
|--------|-------|
| PENDING | Zinc |
| SENT | Green |
| FAILED | Red |
| SKIPPED | Zinc-400 |
| RETRY | Yellow |
| APPLIED | Blue |
| REPLY | Indigo |
| INTERVIEW | Purple |
| TECHNICAL_TEST | Orange |
| HR_INTERVIEW | Pink |
| OFFERING | Emerald |
| ACCEPTED | Emerald-700 |

### Manual Statuses (for dropdown select)
APPLIED, REPLY, INTERVIEW, TECHNICAL_TEST, HR_INTERVIEW, OFFERING, ACCEPTED, REJECTED

### Action Buttons (by status)
| Status | Buttons Tampil |
|--------|----------------|
| RUNNING | [Pause] [Stop] |
| PAUSED | [Resume] [Stop] |
| SCHEDULED | [Stop] |
| Lainnya | None |

### States
- **Loading**: "Loading..."
- **Not found**: "Batch not found"
- **Error**: Red alert box

---

## 11. BATCH WIZARD (`/dashboard/batches/new`)

### Komponen
| Elemen | Keterangan |
|--------|------------|
| **Step Indicator** | 7 step numbers + labels with arrows, horizontal scroll di mobile |
| **Step Content** | Berbeda per step (lihat di bawah) |
| **Navigation** | [Back] button (left) + [Next] / [Create Batch] (right) |

### Steps
| # | Step | Input |
|---|------|-------|
| 1 | **Name** | Batch name input + description textarea |
| 2 | **Email** | Pilih email account dari list (card-style selector) |
| 3 | **Template** | Pilih template dari list (card-style selector) |
| 4 | **Documents** | Multi-select documents dengan checkbox ✓ |
| 5 | **Recipients** | Search + multi-select recipients |
| 6 | **Schedule** | Datetime, delay (seconds), active hours start/end, active days (7 toggle buttons), start immediately checkbox |
| 7 | **Preview** | Summary of all selections in a list |

### Schedule Data
| Field | Type | Default |
|-------|------|---------|
| Scheduled At | datetime-local | empty |
| Delay Seconds | number | 60 |
| Active Hours Start | time | 08:00 |
| Active Hours End | time | 17:00 |
| Active Days | multi-toggle | MON,TUE,WED,THU,FRI |
| Start Immediately | checkbox | true |

### States
- **Step 5 search**: debounced search by company name
- **Next disabled**: when required field empty
- **Submitting**: "Creating..." with loading
- **Error**: red alert box

---

## 12. EMAIL ACCOUNTS PAGE (`/dashboard/email-accounts`)

### Komponen
| Elemen | Keterangan |
|--------|------------|
| **Header** | Title + "Hubungkan Gmail" button |
| **Info Box** | Blue info alert tentang limit Gmail |
| **Account List** | Card list: avatar (initial), email, provider, Default badge, daily limit |
| **Account Actions** | [Jadikan Default] (if not default), [Putuskan] |

### Account Card Data
| Field | Contoh |
|-------|--------|
| Avatar | "G" (first letter of provider) |
| Email | "user@gmail.com" |
| Provider | "gmail" |
| Default Badge | "Default" (info variant) |
| Daily Limit | "Limit: ~500/hari" |

### States
- **Loading**: 2 skeleton cards
- **Empty**: Dashed border "Belum ada akun email terhubung."
- **Connecting**: button loading spinner "Menghubungkan..."
- **OAuth Popup**: window.open to Google

---

## 13. UI PRIMITIVES (Design System)

### Button
| Variant | Use Case |
|---------|----------|
| `default` | Primary CTA (zinc-900 bg) |
| `primary` | Blue accent |
| `secondary` | Zinc-100 bg |
| `outline` | Border only |
| `ghost` | No border/bg |
| `danger` | Red (destructive) |

| Size | Height | Font |
|------|--------|------|
| `sm` | 32px (h-8) | text-xs |
| `md` | 40px (h-10) | text-sm |
| `lg` | 48px (h-12) | text-base |

**State**: `loading` → spinner icon + disabled

### Card
| Sub-component | Keterangan |
|---------------|------------|
| `Card` | Container, rounded-xl, border, shadow |
| `CardHeader` | Header section (p-6 pb-0) |
| `CardTitle` | h3, text-lg, font-semibold |
| `CardDescription` | p, text-sm, text-zinc-500 |
| `CardContent` | Content (p-6 pt-4) |
| `CardFooter` | Footer (flex, p-6 pt-0) |

### Dialog / Modal
| Property | Nilai |
|----------|-------|
| Backdrop | bg-black/50 + backdrop-blur-sm |
| Panel | max-w-lg, rounded-xl, white bg |
| Close button | X icon top-right |
| Escape | Keyboard dismiss |
| Body scroll | Locked when open |

### Input
| Property | Nilai |
|----------|-------|
| Label | text-sm font-medium above |
| Input | h-10, rounded-lg, border |
| Error | Red border + red helper text |
| Helper text | Zinc-400 below |
| Focus | Ring-2 zinc-400 |

### Select
Same as Input pattern but with `<select>` element + options.

### Textarea
Same as Input pattern but with `<textarea>` (min-h-[80px]).

### Badge
| Variant | Use Case |
|---------|----------|
| `default` | Generic tags |
| `success` | Positive status |
| `warning` | Warning status |
| `danger` | Error/critical |
| `info` | Informational |

### Table
| Property | Nilai |
|----------|-------|
| Wrapper | overflow-auto |
| Header | border-b, bg-zinc-50, text-xs, uppercase-ish font-semibold |
| Row | border-b, hover:bg-zinc-50 |
| Cell | p-4 align-middle |

### Skeleton
| Properti | Nilai |
|----------|-------|
| Animation | animate-pulse |
| Color | bg-zinc-200 (light) / bg-zinc-800 (dark) |
| Shape | rounded-md |

---

## 14. GLOBAL / TEMA

| Token | Light | Dark |
|-------|-------|------|
| Background | #ffffff | #0a0a0a |
| Foreground | #171717 | #ededed |
| Font Sans | Geist Sans | Geist Sans |
| Font Mono | Geist Mono | Geist Mono |
| Border | zinc-200 | zinc-800 |

### Responsive Breakpoints (Tailwind default)
| Prefix | Min Width |
|--------|-----------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

---

## 15. USER FLOW

```
Landing Page
  ├── [Mulai Sekarang] → /login
  └── [Daftar] → /register
       │
       ▼
  Google OAuth
       │
       ▼
  Dashboard (/dashboard)
       │
       ├── Profile ─── edit profil, pendidikan, pengalaman
       ├── Dokumen ─── upload, filter, delete dokumen
       ├── Template ─── CRUD template, clone, preview, favorite
       ├── Perusahaan ─── CRUD recipient, import/export CSV
       ├── Batch Lamaran
       │     ├── [Create Batch] → Wizard 7 langkah
       │     └── [Batch Detail] → monitoring + update status
       └── Email ─── connect Gmail, set default, disconnect
```