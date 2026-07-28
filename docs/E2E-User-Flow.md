# Pake Mail — E2E User Flow Dokumentasi

## Daftar Isi

1. [Flow Registrasi & Login](#1-flow-registrasi--login)
2. [Flow Dashboard](#2-flow-dashboard)
3. [Flow Koneksi Email (Gmail OAuth)](#3-flow-koneksi-email-gmail-oauth)
4. [Flow Kelola Template](#4-flow-kelola-template)
5. [Flow Kelola Recipients](#5-flow-kelola-recipients)
6. [Flow Kelola Dokumen](#6-flow-kelola-dokumen)
7. [Flow Profil & Riwayat](#7-flow-profil--riwayat)
8. [Flow Batch Campaign (Core)](#8-flow-batch-campaign-core)
9. [Flow Monitoring Batch](#9-flow-monitoring-batch)
10. [Flow Update Status Lamaran](#10-flow-update-status-lamaran)
11. [Diagram Siklus Batch](#11-diagram-siklus-batch)
12. [Diagram Alur Data Email](#12-diagram-alur-data-email)

---

## 1. Flow Registrasi & Login

### 1.1 Registrasi

```
[Landing Page] --klik "Get Started"--> [Register Page (/register)]
                                              |
                                     Klik "Sign in with Google"
                                              |
                              Google OAuth consent screen (redirect)
                                              |
                     +------------------------+------------------------+
                     |                                                 |
             Setuju akses                                     Batal/Kembali
                     |                                                 |
          NextAuth buat User + Account                     Kembali ke Register
          di DB via PrismaAdapter
                     |
          Session dibuat (JWT/Database)
                     |
          Redirect ke /dashboard
```

**Step-by-step:**

1. User buka aplikasi di `/` (landing page).
2. Klik tombol **"Get Started"** → navigasi ke `/register`.
3. Klik **"Sign in with Google"** → trigger `signIn("google", { redirectTo: "/dashboard" })`.
4. Google menampilkan consent screen (email, profile).
5. Setelah approve, NextAuth.js menerima callback di `/api/auth/[...nextauth]`.
6. PrismaAdapter membuat:
   - `User` baru (id UUID, email, name, createdAt).
   - `Account` baru (provider: google, providerAccountId, access_token, refresh_token).
   - `Session` baru (sessionToken, expires).
7. User di-redirect ke `/dashboard`.
8. Session tersimpan di cookie browser.

### 1.2 Login (User Existing)

```
[Landing Page] --klik "Sign In"--> [Login Page (/login)]
                                            |
                                   Klik "Sign in with Google"
                                            |
                              Google OAuth consent (auto-approved
                              jika sudah pernah grant)
                                            |
                              NextAuth cocokkan providerAccountId
                              dengan Account existing
                                            |
                              Update Session, redirect ke /dashboard
```

### 1.3 Route Protection

- `(dashboard)/layout.tsx` panggil `auth()` → jika null, redirect ke `/login`.
- Semua API route gunakan `requireUserId()` → jika unauth, return 401.
- Middleware di `middleware.ts` → matcher mencakup route dashboard.

---

## 2. Flow Dashboard

```
[Login] --> [/dashboard]
              |
    +---------+---------+---------+---------+---------+---------+
    |         |         |         |         |         |         |
  Stats    Batches  Templates Recipients Documents  Email    Profile
  Cards    (list)   (list)    (list)    (list)    Accounts  (form)
                                                    (list)
```

**Halaman Dashboard (`/dashboard`):**

1. `GET /api/dashboard/stats` dipanggil → 7 query paralel:
   - Total batch user.
   - Batch aktif (RUNNING + SCHEDULED).
   - Total recipients.
   - Total email accounts terhubung.
   - Distribusi status semua BatchRecipient (PENDING, SENT, FAILED, etc).
   - **5 batch terbaru** (dengan nama, status, template, email account, progress).
   - **8 reply/positive terbaru** (recipient name, company, status, timestamp).
2. Tampil dalam card metrics + tabel recent campaigns + tabel recent replies.
3. Setiap card bisa diklik → navigasi ke halaman terkait.

---

## 3. Flow Koneksi Email (Gmail OAuth)

> **Bedakan dengan Auth Login:** Ini OAuth terpisah untuk akses Gmail API (mengirim email).

```
[/dashboard/email-accounts]
         |
  Klik "Connect Gmail Account"
         |
  Popup baru ke Google OAuth (scope: gmail.send, gmail.modify)
         |
  User approve consent
         |
  Callback ke /api/email-accounts/callback
         |
  Kirim postMessage ke popup parent
         |
  Parent terima message, panggil POST /api/email-accounts
         |
  Token dienkripsi AES-256-GCM, disimpan di EmailAccount.oauthToken
         |
  EmailAccount record dibuat (userId, provider, email, isDefault, dailyLimit)
         |
  Popup ditutup, daftar di-refresh
```

**Step-by-step:**

1. Buka `/dashboard/email-accounts`.
2. Klik **"Connect Gmail Account"** → popup window ke Google OAuth.
3. Scope: `https://www.googleapis.com/auth/gmail.send` + `https://www.googleapis.com/auth/gmail.modify`.
4. User pilih akun Gmail, klik Allow.
5. Google redirect ke `/api/email-accounts/callback?code=...`.
6. Backend tukar `code` dengan access + refresh token via `googleapis`.
7. Callback kirim `postMessage({ type: "gmail-connected", email })` ke parent popup.
8. Parent tangkap event, panggil `POST /api/email-accounts` dengan `{ code }`.
9. Backend enkripsi token (AES-256-GCM), simpan di DB, buat record `EmailAccount`.
10. Popup auto-close, daftar email account ter-refresh.
11. User bisa **set default** (PUT `/api/email-accounts/default`) atau **disconnect** (DELETE `/api/email-accounts`).

**Gagal:** Jika token invalid/revoked, worker akan gagal kirim email → log error di ActivityLog.

---

## 4. Flow Kelola Template

### 4.1 Membuat Template

```
[/dashboard/templates]
         |
  Klik "New Template" --> Dialog modal
         |
  Isi: name, subject, body (dengan variable hints), closing
         |
  Variable hints tersedia: {{full_name}}, {{company}}, {{position}},
  {{phone}}, {{email}}, {{portfolio}}, {{linkedin}}, {{address}}
         |
  Submit --> POST /api/templates
         |
  Template tersimpan di DB (userId, name, subject, body, closing, isFavorite)
         |
  List template di-refresh
```

### 4.2 Mengedit Template

```
  Klik icon edit di card template
         |
  Dialog modal pre-filled dengan data existing
         |
  Ubah field, submit --> PUT /api/templates
         |
  Template ter-update
```

### 4.3 Clone Template

```
  Klik icon clone di card template
         |
  POST /api/templates/clone { id }
         |
  Template baru dengan nama "nama (copy)", isFavorite: false
         |
  Muncul di list tanpa perlu refresh
```

### 4.4 Favorit & Delete

- **Toggle Favorit:** Klik icon star → PUT /api/templates { id, isFavorite: !current }.
- **Delete:** Klik icon trash → konfirmasi → DELETE /api/templates?id=...

---

## 5. Flow Kelola Recipients

### 5.1 Menambah Recipient Manual

```
[/dashboard/recipients]
         |
  Klik "Add Recipient" --> Dialog modal
         |
  Isi: companyName*, hrEmail*, position, location, website, source, notes, tags
         |
  Submit --> POST /api/recipients
         |
  Duplicate detection: jika hrEmail sudah ada, return error unik
         |
  Tersimpan, list di-refresh
```

### 5.2 Import CSV

```
  Klik "Import CSV"
         |
  Pilih file CSV dengan format:
  companyName, hrEmail, position, location, website, source, notes, tags
         |
  Parse di frontend --> preview table
         |
  Konfirmasi --> POST /api/recipients/import [{ rows }]
         |
  Backend: upsert per row (skip/merge duplikat berdasarkan hrEmail)
         |
  Batch response dengan count success, skipped, failed
         |
  List di-refresh
```

### 5.3 Export CSV

```
  Klik "Export"
         |
  GET /api/recipients/export
         |
  Backend query semua recipients user + stream CSV
         |
  Download file recipients-export-{timestamp}.csv
```

### 5.4 Search & Filter

- **Search:** Input search → GET `/api/recipients?search=...` → filter by companyName, hrEmail, position.
- **Tag filter:** Dropdown tag → filter by tags contains.
- **Inline edit:** Klik field di table → edit langsung → PUT /api/recipients.
- **Bulk delete:** Centang multiple → konfirmasi → delete per ID.

---

## 6. Flow Kelola Dokumen

### 6.1 Upload Dokumen

```
[/dashboard/documents]
         |
  Klik "Upload Document" --> Dialog
         |
  Pilih file (PDF/DOC/DOCX max 10MB)
         |
  Pilih kategori: CV | Portfolio | Ijazah | SKCK | Transkrip | Other
         |
  Submit --> POST /api/documents/upload
         |
  Frontend: FormData dengan file + category
  Backend:
    1. Validasi tipe file & size
    2. Generate unique key: documents/{userId}/{nanoid}-{originalName}
    3. Upload ke S3 via PutObjectCommand (Backblaze B2)
    4. Buat Document record di DB (userId, name, category, fileUrl, fileSizeKb)
         |
  Muncul di list dengan badge kategori
```

### 6.2 Download/Preview

- **Download:** Klik nama file → `getSignedUrl` (expired 1 jam) → redirect ke S3 signed URL.
- **Delete:** Klik trash → konfirmasi → DELETE `/api/documents?id=...`.
  - Jika dokumen sedang digunakan di batch aktif, delete ditolak.

---

## 7. Flow Profil & Riwayat

```
[/dashboard/profile]
         |
  GET /api/profile --> data profile + educations[] + experiences[]
         |
  Form: fullName, phone, email, linkedinUrl, portfolioUrl, address, birthDate
         |
  Submit --> PUT /api/profile (upsert berdasarkan userId)
```

### 7.1 Kelola Pendidikan

```
  Tab Education
         |
  "Add Education" --> isi institution, degree, major, startYear, endYear
         |
  Submit --> POST /api/profile/education (perlu profile sudah ada)
         |
  Edit --> PUT /api/profile/education
  Delete --> DELETE /api/profile/education?id=...
```

### 7.2 Kelola Pengalaman

```
  Tab Experience
         |
  "Add Experience" --> isi company, position, startDate, endDate, description
         |
  Submit --> POST /api/profile/experience
         |
  Edit --> PUT /api/profile/experience
  Delete --> DELETE /api/profile/experience?id=...
```

> **Catatan:** Data profil digunakan untuk variable rendering template email (`{{full_name}}`, `{{phone}}`, dll).

---

## 8. Flow Batch Campaign (Core)

### 8.1 Prasyarat

Sebelum bisa membuat batch, user harus memiliki:
- Minimal 1 **Email Account** terhubung.
- Minimal 1 **Template**.
- Minimal 1 **Recipient**.
- **Profile** (disarankan, untuk variable rendering).

### 8.2 Wizard Pembuatan Batch (7 Steps)

```
[/dashboard/batches/new]
         |
  Step 1: Basic Info
  ├── Nama batch (required)
  └── Deskripsi (optional)
         |
  Step 2: Email Account
  ├── Pilih dari daftar email yang terhubung
  └── (Jika belum ada: link "Connect Gmail Account")
         |
  Step 3: Template
  ├── Pilih template (preview subject + body)
  └── (Jika belum ada: link "Buat Template")
         |
  Step 4: Dokumen (Optional)
  ├── Centang dokumen yang akan dilampirkan
  └── Bisa multiple, akan dikirim sebagai attachment
         |
  Step 5: Recipients
  ├── Search/filter recipients
  ├── Centang satu/semua
  └── Tampilkan count terpilih
         |
  Step 6: Schedule
  ├── "Start Immediately" toggle
  ├── Scheduled Date & Time (jika tidak immediate)
  ├── Delay Between Emails (default 60 detik)
  ├── Active Hours Start/End (misal 08:00 - 17:00)
  └── Active Days (checkbox: Senin-Minggu)
         |
  Step 7: Review
  ├── Ringkasan semua pilihan
  ├── Total recipients
  ├── Estimated duration
  └── Tombol "Create & Start" atau "Save as Draft"
         |
  Submit:
  1. POST /api/batches --> Batch DRAFT dibuat
  2. POST /api/batches/recipients --> Link recipients ke batch
  3. POST /api/batches/documents --> Link dokumen ke batch (jika ada)
  4. Jika "Start Immediately": POST /api/batches/start
  5. Redirect ke /dashboard/batches/{id}
```

### 8.3 Proses Start Batch

```
POST /api/batches/start { batchId }
         |
  1. Load batch + recipients + documents + emailAccount + template dari DB
  2. Validasi: status harus DRAFT atau SCHEDULED
         |
  3. Decrypt OAuth token dari emailAccount
  4. Refresh token jika expired (otomatis via Google API)
         |
  5. Untuk setiap recipient dengan status PENDING:
     ├── Buat BullMQ job dengan:
     │   ├── name: "email-send"
     │   ├── data: { batchRecipientId, batchId, recipientId,
     │   │           emailAccountId, templateId, documentIds }
     │   ├── delay: (
     │   │   scheduledAt + (index * delaySeconds * 1000)
     │   │   - Date.now()
     │   │ )
     │   └── attempts: retryMax + 1 (exponential backoff)
     └── Masuk antrian: email-batch-queue
         |
  6. Update batch status:
     ├── Jika scheduledAt <= now --> RUNNING
     └── Jika scheduledAt > now --> SCHEDULED
         |
  7. Create ActivityLog: "Batch started with N recipients"
```

### 8.4 Proses Worker (Background)

```
BullMQ Worker: processEmailSend(job)
         |
  1. Load data dari job.data:
     ├── EmailAccount (decrypt oauthToken AES-256-GCM)
     ├── EmailTemplate (subject, body, closing)
     ├── Recipient (companyName, hrEmail, position)
     ├── Profile (fullName, phone, email, portfolio, linkedin, address)
     └── Documents[] (optional, get signed URL dari S3)
         |
  2. Render template:
     ├── Replace {{full_name}} --> profile.fullName
     ├── Replace {{company}} --> recipient.companyName
     ├── Replace {{position}} --> recipient.position
     ├── Replace {{phone}}, {{email}}, {{portfolio}},
     │   {{linkedin}}, {{address}} --> dari profile
     └── Berlaku untuk subject, body, dan closing
         |
  3. Bangun MIME message:
     ├── Boundary: multipart/mixed
     ├── Headers:
     │   ├── From: emailAccount.email
     │   ├── To: recipient.hrEmail
     │   ├── Subject: Base64 encoded subject
     │   ├── MIME-Version: 1.0
     │   └── Content-Type: multipart/mixed
     ├── Part 1: multipart/alternative
     │   ├── text/plain (plain text body)
     └── Part 2-N: attachments
         ├── Fetch file dari S3 signed URL
         ├── Encode Base64
         └── Content-Type sesuai file
         |
  4. Kirim via Gmail API:
     ├── google.gmail({ version: "v1" }).users.messages.send({
     │     userId: "me",
     │     requestBody: { raw: base64urlEncodedMessage }
     │   })
     └── Token refresh listener: auto-update jika 401
         |
  5. Update status:
     ├── BatchRecipient.status = SENT
     ├── BatchRecipient.sentAt = now()
     ├── BatchRecipient.updatedAt = now()
     └── Create ActivityLog: "Email sent to {company}"
         |
  --- Jika Gagal ---
     ├── Increment BatchRecipient.retryCount
     ├── Jika retryCount < retryMax:
     │   └── throw error --> BullMQ retry otomatis
     └── Jika retryCount >= retryMax:
         ├── BatchRecipient.status = FAILED
         ├── BatchRecipient.errorLog = error.message
         └── Create ActivityLog: "Failed to send to {company}: {error}"
```

---

## 9. Flow Monitoring Batch

```
[/dashboard/batches/{id}]
         |
  GET /api/batches/{id}
         |
  Return:
  - Batch info (name, status, schedule, settings)
  - Email account (email terdaftar)
  - Template (subject preview)
  - Documents (nama file)
  - Recipients table dengan status masing-masing
  - Stats: total, sent, failed, pending, replied, etc.
  - ActivityLog terkait batch
         |
  Actions tersedia (tergantung status):
  ┌──────────────────────────────────────────────────────────────┐
  │ Status           | Actions                                   │
  │──────────────────┼───────────────────────────────────────────│
  │ DRAFT            | Edit, Delete, Start                       │
  │ SCHEDULED        | Stop                                      │
  │ RUNNING          | Pause, Stop                               │
  │ PAUSED           | Resume, Stop                              │
  │ COMPLETED        | View Only, Delete                         │
  │ STOPPED          | View Only, Delete                         │
  │ FAILED           | View Only, Delete                         │
  └──────────────────────────────────────────────────────────────┘
```

### 9.1 Pause Batch

```
  Klik "Pause"
         |
  POST /api/batches/pause { batchId }
         |
  1. Validasi: status harus RUNNING
  2. Batch.status = PAUSED
  3. ActivityLog: "Batch paused by user"
  4. Jobs yang sudah di queue tetap jalan (BullMQ tidak punya
     pause-per-job, hanya stop mengirim job baru)
```

### 9.2 Resume Batch

```
  Klik "Resume"
         |
  POST /api/batches/resume { batchId }
         |
  1. Validasi: status harus PAUSED
  2. Batch.status = RUNNING
  3. Cari semua BatchRecipient dengan status PENDING
  4. Re-queue jobs untuk recipients PENDING
  5. ActivityLog: "Batch resumed"
```

### 9.3 Stop Batch

```
  Klik "Stop"
         |
  POST /api/batches/stop { batchId }
         |
  1. Validasi: status SCHEDULED, RUNNING, atau PAUSED
  2. Semua BatchRecipient PENDING --> SKIPPED
  3. Batch.status = STOPPED
  4. ActivityLog: "Batch stopped by user, N recipients skipped"
```

### 9.4 Delete Batch

```
  Klik "Delete"
         |
  DELETE /api/batches?id={batchId}
         |
  Hanya bisa delete jika status: DRAFT, STOPPED, FAILED, COMPLETED
  Cascade: BatchRecipient, BatchDocument, ActivityLog ikut terhapus
```

---

## 10. Flow Update Status Lamaran

```
[/dashboard/batches/{id}] --> Table Recipients
         |
  Dropdown status per recipient:
  PENDING | SENT | FAILED | SKIPPED | RETRY |
  APPLIED | REPLY | INTERVIEW | TECHNICAL_TEST |
  HR_INTERVIEW | OFFERING | ACCEPTED
         |
  User pilih status baru
         |
  PUT /api/batches/status { batchRecipientId, status }
         |
  1. Update BatchRecipient.status = status baru
  2. Update BatchRecipient.updatedAt = now
  3. Create ActivityLog: "Status updated to {status} for {company}"
  4. Jika status adalah APPLIED atau lebih tinggi (positive):
     - Akan muncul di dashboard "Recent Replies" table
```

**Pipeline Status Lamaran:**

```
PENDING ──► SENT ──► APPLIED ──► REPLY ──► INTERVIEW ──► TECHNICAL_TEST
                                                          │
                                                          ▼
                                                    HR_INTERVIEW
                                                          │
                                                          ▼
                                                      OFFERING
                                                          │
                                                          ▼
                                                      ACCEPTED

FAILED ◄── (auto dari worker setelah retryMax)
SKIPPED ◄── (manual via Stop)
RETRY ◄── (auto dari worker saat gagal, masih ada attempt)
```

---

## 11. Diagram Siklus Batch

```
                          ┌──────────┐
                          │  DRAFT   │
                          └────┬─────┘
                               │ Start (future)
                               ▼
                     ┌─────────────────┐
               ┌─────│   SCHEDULED     │
               │     └────────┬────────┘
               │              │ scheduledAt arrives
               │              ▼
               │     ┌─────────────────┐
               │     │    RUNNING      │◄────────────┐
               │     └──┬──────┬──────┘              │
               │        │      │                     │
               │     Pause    Complete               │
               │        │      │                     │
               │        ▼      ▼                     │
               │  ┌────────┐  ┌───────────┐          │
               │  │ PAUSED │  │ COMPLETED │          │
               │  └────┬───┘  └───────────┘          │
               │       │ Resume                       │
               │       └──────────────────────────────┘
               │
               │  ┌──────────┐  ┌───────────┐
               ├──│ STOPPED  │  │  FAILED   │
               │  └──────────┘  └───────────┘
               │       │             │
               │       └──────┬──────┘
               │              │
               ▼              ▼
           Dapat dihapus (DELETE)
```

---

## 12. Diagram Alur Data Email

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PAKE MAIL ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────────┐     ┌──────────────────┐
  │ Browser  │────▶│  Next.js      │────▶│  PostgreSQL       │
  │ (React)  │     │  App Router   │     │  (Supabase)       │
  │          │◀────│  API Routes   │◀────│  (Prisma ORM)     │
  └──────────┘     └──────┬───────┘     └──────────────────┘
                          │
                 ┌────────┴────────┐
                 │                 │
          ┌──────▼──────┐  ┌──────▼──────┐
          │ BullMQ      │  │ Backblaze   │
          │ Queue       │  │ B2 (S3)     │
          │ (Upstash    │  │ Storage     │
          │  Redis)     │  │             │
          └──────┬──────┘  └─────────────┘
                 │
          ┌──────▼──────┐
          │ Worker      │
          │ (email-     │
          │  worker.ts) │
          └──────┬──────┘
                 │
                 ▼
          ┌──────────────┐
          │ Gmail API    │
          │ (googleapis) │
          └──────┬───────┘
                 │
                 ▼
          ┌──────────────┐
          │  HR Email    │
          │  Inbox       │
          └──────────────┘

  Alur Lengkap Pengiriman Email:

  [1] React UI (Batch Wizard)
        │ POST /api/batches/start
        ▼
  [2] API Route (/api/batches/start)
        │ Query DB: batch, recipients, template, documents, emailAccount
        │ Validate status
        │ Decrypt OAuth token
        ▼
  [3] BullMQ Queue (email-batch-queue)
        │ Add job per recipient dengan delay
        ▼
  [4] BullMQ Worker (email-worker.ts)
        │ Load job data dari DB
        │ Render template (replace variables)
        │ Fetch attachments dari S3
        │ Bangun MIME message
        ▼
  [5] Gmail API (users.messages.send)
        │ Kirim email via akun Gmail user
        ▼
  [6] Update DB
        │ BatchRecipient.status = SENT
        │ ActivityLog.created
```

---

## Lampiran: Ringkasan Semua Endpoint

### API Endpoints

| Metode | Route | Fungsi |
|--------|-------|--------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth handler |
| GET | `/api/health` | Cek koneksi DB + Redis |
| GET | `/api/dashboard/stats` | Statistik dashboard |
| GET/POST/DELETE | `/api/email-accounts` | CRUD email accounts |
| PUT | `/api/email-accounts/default` | Set default account |
| GET | `/api/email-accounts/callback` | Gmail OAuth callback |
| GET/POST/PUT/DELETE | `/api/templates` | CRUD templates |
| POST | `/api/templates/clone` | Clone template |
| GET/POST/PUT/DELETE | `/api/recipients` | CRUD recipients |
| POST | `/api/recipients/import` | Import CSV |
| GET | `/api/recipients/export` | Export CSV |
| GET/DELETE | `/api/documents` | List/delete documents |
| POST | `/api/documents/upload` | Upload ke S3 |
| GET/PUT | `/api/profile` | Get/update profile |
| POST/PUT/DELETE | `/api/profile/education` | CRUD pendidikan |
| POST/PUT/DELETE | `/api/profile/experience` | CRUD pengalaman |
| GET/POST/PUT/DELETE | `/api/batches` | CRUD batches |
| GET | `/api/batches/[id]` | Detail batch |
| POST | `/api/batches/start` | Start batch |
| POST | `/api/batches/stop` | Stop batch |
| POST | `/api/batches/pause` | Pause batch |
| POST | `/api/batches/resume` | Resume batch |
| PUT | `/api/batches/status` | Update recipient status |
| POST/DELETE | `/api/batches/recipients` | Link/unlink recipients |
| POST | `/api/batches/documents` | Link dokumen ke batch |

### Frontend Pages

| Route | Halaman |
|-------|---------|
| `/` | Landing page |
| `/login` | Login |
| `/register` | Register |
| `/dashboard` | Dashboard utama |
| `/dashboard/batches` | Daftar batch |
| `/dashboard/batches/new` | Wizard batch |
| `/dashboard/batches/[id]` | Detail batch |
| `/dashboard/templates` | Kelola template |
| `/dashboard/recipients` | Kelola recipients |
| `/dashboard/documents` | Kelola dokumen |
| `/dashboard/email-accounts` | Kelola email accounts |
| `/dashboard/profile` | Profil & riwayat |
