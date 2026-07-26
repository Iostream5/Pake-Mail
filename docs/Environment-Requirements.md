# Environment & Requirements Configuration — Pake Mail V1

Dokumen ini berisi seluruh **environment variables**, **API keys**, **kredensial**, dan konfigurasi layanan eksternal yang dibutuhkan untuk menjalankan Pake Mail V1. Berdasarkan analisis dari [PRD-PakeMail-v1.md](PRD-PakeMail-v1.md), [PakeMail-Project-Phasing.md](PakeMail-Project-Phasing.md), dan [pakemail-erd.mermaid](pakemail-erd.mermaid).

---

## 1. Database — PostgreSQL (via Supabase)

### 1.1 Supabase Project — Data Koneksi

| Variabel | Deskripsi | Contoh / Sumber |
|---|---|---|
| `DATABASE_URL` | Full connection string PostgreSQL dengan password | `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` |
| `SUPABASE_URL` | URL project Supabase | `https://[REF].supabase.co` |
| `SUPABASE_ANON_KEY` | Public anon key (safe for client-side) | Dapatkan dari Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only, jangan pernah di-client) | Dapatkan dari Supabase Dashboard > Settings > API |

**Cara mendapatkan:**
1. Buat project baru di [supabase.com](https://supabase.com)
2. Buka **Project Settings > Database > Connection string > URI** untuk `DATABASE_URL`
3. Buka **Project Settings > API** untuk `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### 1.2 Database Tabel (via Prisma Schema)

Semua tabel akan dimigrasi via Prisma ORM. Berikut daftar tabel berdasarkan ERD:

| # | Nama Tabel | Deskripsi |
|---|---|---|
| 1 | `User` | Akun user (auth bisa pakai Supabase Auth built-in atau custom) |
| 2 | `EmailAccount` | Akun Gmail/Outlook yang terhubung via OAuth |
| 3 | `Profile` | Data profil pribadi user (1 user = 1 profile) |
| 4 | `Education` | Riwayat pendidikan (1 user bisa punya banyak) |
| 5 | `Experience` | Riwayat pengalaman kerja (1 user bisa punya banyak) |
| 6 | `Document` | Library dokumen user |
| 7 | `EmailTemplate` | Template email user |
| 8 | `Recipient` | Database perusahaan tujuan lamaran |
| 9 | `Batch` | Batch lamaran (core entity) |
| 10 | `BatchDocument` | Many-to-many join Batch ↔ Document |
| 11 | `BatchRecipient` | Join entity Batch ↔ Recipient + status pengiriman |
| 12 | `ActivityLog` | Log aktivitas sistem |

> **Catatan:** Jika menggunakan **Supabase Auth** untuk User, tabel `User` bisa diganti/terintegrasi dengan tabel `auth.users` bawaan Supabase, dan kita buat tabel `public.user_profiles` untuk data tambahan.

### 1.3 Ringkasan Field per Tabel

Detail lengkap field ada di [pakemail-erd.mermaid](pakemail-erd.mermaid). Berikut ringkasan type data:

| Tabel | PK | FK | Fields Utama |
|---|---|---|---|
| User | uuid id | — | email, password_hash, name, created_at |
| EmailAccount | uuid id | user_id | provider (gmail/outlook), email, oauth_token_encrypted, is_default, daily_limit, connected_at |
| Profile | uuid id | user_id | full_name, phone, email, linkedin_url, portfolio_url, address, birth_date |
| Education | uuid id | profile_id | institution, degree, major, start_year, end_year |
| Experience | uuid id | profile_id | company, position, start_date, end_date, description |
| Document | uuid id | user_id | name, category (enum), file_url, file_size_kb, version, created_at, updated_at |
| EmailTemplate | uuid id | user_id | name, subject, body, closing, is_favorite, created_at |
| Recipient | uuid id | user_id | company_name, hr_email, position, location, website, source, notes, tags, created_at |
| Batch | uuid id | user_id, email_account_id, template_id | name, description, status (enum), scheduled_at, delay_seconds, active_hours_start, active_hours_end, active_days, retry_max, auto_stop_threshold, created_at |
| BatchDocument | uuid id | batch_id, document_id | — |
| BatchRecipient | uuid id | batch_id, recipient_id | status (enum), sent_at, error_log, retry_count, updated_at |
| ActivityLog | uuid id | user_id, batch_id, batch_recipient_id | event_type, message, created_at |

---

## 2. Redis (via Upstash / Redis Stack)

BullMQ membutuhkan Redis untuk job queue persistent.

| Variabel | Deskripsi | Contoh / Sumber |
|---|---|---|
| `REDIS_URL` | Full connection string Redis | `redis://default:[PASSWORD]@[ENDPOINT].upstash.io:6379` |
| `REDIS_HOST` | Host Redis (jika tidak pakai URL) | `[ENDPOINT].upstash.io` |
| `REDIS_PORT` | Port Redis | `6379` |
| `REDIS_PASSWORD` | Password Redis | Dapatkan dari Upstash / Redis provider |

**Opsi provider Redis:**
- [Upstash](https://upstash.com) — Serverless Redis, recommended untuk Vercel deployment
- Redis Stack lokal untuk development
- Redis Cloud / Redis Enterprise

---

## 3. Object Storage — Dokumen (S3-compatible)

Untuk menyimpan file dokumen user (CV, Portfolio, Ijazah, dll) secara privat.

| Variabel | Deskripsi | Contoh / Sumber |
|---|---|---|
| `STORAGE_BUCKET_NAME` | Nama bucket untuk dokumen | `pakemail-documents` |
| `STORAGE_ACCESS_KEY_ID` | Access Key ID | Dapatkan dari provider storage |
| `STORAGE_SECRET_ACCESS_KEY` | Secret Access Key | Dapatkan dari provider storage |
| `STORAGE_ENDPOINT` | Endpoint URL storage (khusus non-AWS S3) | `https://[ACCOUNT_ID].r2.cloudflarestorage.com` |
| `STORAGE_REGION` | Region (untuk AWS S3) | `ap-southeast-1` (Singapore) |
| `STORAGE_PUBLIC_URL` | Public URL bucket (jika ada) | Opsional, untuk signed URL |

**Opsi provider storage:**
- **AWS S3** — Standar industri
- **Cloudflare R2** — Zero egress fee, cocok untuk storage dokumen
- **Supabase Storage** — Built-in dengan Supabase

---

## 4. Google OAuth 2.0 — Gmail API

Untuk mengirim email via Gmail API, user harus terautentikasi via OAuth 2.0 dengan scope Gmail.

### 4.1 Google Cloud Console — Data Kredensial

| Variabel | Deskripsi | Contoh / Sumber |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Client ID dari Google Cloud Console | `[XXXXXXXX].apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Client Secret dari Google Cloud Console | `GOCSPX-[XXXXXXXX]` |
| `GOOGLE_REDIRECT_URI` | Redirect URI setelah OAuth login | `http://localhost:3000/api/auth/callback/google` (dev) / `https://[your-domain].com/api/auth/callback/google` (prod) |
| `GOOGLE_REFRESH_TOKEN` | Refresh token untuk akses jangka panjang (disimpan per user di DB) | Dihasilkan saat OAuth flow |

**Cara mendapatkan:**
1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih project yang sudah ada
3. Buka **APIs & Services > OAuth consent screen** → Pilih **External** → Isi nama aplikasi, support email, dll
4. Buka **APIs & Services > Credentials** → **Create Credentials > OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:3000`, `https://[your-domain].com`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`, `https://[your-domain].com/api/auth/callback/google`
5. Catat **Client ID** dan **Client Secret** yang muncul
6. Buka **APIs & Services > Library** → Cari dan **Enable**:
   - `Gmail API`

### 4.2 Gmail API — OAuth Scopes yang Dibutuhkan

| Scope | Level Akses | Digunakan Untuk |
|---|---|---|
| `https://www.googleapis.com/auth/gmail.send` | Send only | Mengirim email atas nama user |
| `https://www.googleapis.com/auth/gmail.readonly` | Read only (minimal) | Mengecek quota/limit, membaca bounce, verifikasi koneksi |
| `https://www.googleapis.com/auth/gmail.modify` | Read + modify (opsional untuk V1.2 nanti) | Auto-detect replies, update label |

**Untuk V1, cukup `gmail.send` + `gmail.readonly`.**

### 4.3 Enkripsi Token OAuth

Token OAuth (access + refresh token) harus disimpan **terenkripsi** di database kolom `EmailAccount.oauth_token_encrypted`.

| Variabel | Deskripsi | Keterangan |
|---|---|---|
| `OAUTH_TOKEN_ENCRYPTION_KEY` | Kunci enkripsi AES-256 untuk token OAuth | Generate dengan: `openssl rand -hex 32` |
| `OAUTH_TOKEN_ENCRYPTION_ALGORITHM` | Algoritma enkripsi | `aes-256-gcm` (recommended) |

---

## 5. NextAuth.js / Supabase Auth — Autentikasi User

### 5.1 Opsi A: Menggunakan NextAuth.js (Auth.js)

| Variabel | Deskripsi | Contoh / Sumber |
|---|---|---|
| `AUTH_SECRET` | Secret key untuk enkripsi session/token JWT | Generate dengan: `openssl rand -base64 32` |
| `AUTH_URL` | URL aplikasi (wajib untuk production) | `http://localhost:3000` (dev) / `https://[your-domain].com` (prod) |
| `AUTH_GOOGLE_ID` | Google Client ID (sama dengan GOOGLE_CLIENT_ID) | Copy dari Google Cloud Console |
| `AUTH_GOOGLE_SECRET` | Google Client Secret (sama dengan GOOGLE_CLIENT_SECRET) | Copy dari Google Cloud Console |

### 5.2 Opsi B: Menggunakan Supabase Auth (Built-in)

Jika menggunakan Supabase Auth, cukup gunakan `SUPABASE_URL` dan `SUPABASE_ANON_KEY` dari sesi 1.1. Supabase Auth sudah handle session management secara built-in.

---

## 6. BullMQ — Job Queue Configuration

BullMQ adalah job queue untuk penjadwalan pengiriman email batch (Fase 3).

| Variabel | Deskripsi | Contoh |
|---|---|---|
| `BULL_QUEUE_NAME` | Nama queue utama | `email-batch-queue` |
| `BULL_CONCURRENCY` | Jumlah worker paralel per instance | `5` (default, sesuaikan dengan resource) |
| `BULL_DEFAULT_RETRY_DELAY` | Delay antar retry (ms) | `60000` (60 detik) |
| `BULL_MAX_RETRIES` | Maksimal retry per job | `3` (default, bisa override per batch) |

---

## 7. Konfigurasi Aplikasi

### 7.1 General

| Variabel | Deskripsi | Contoh Default |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | Nama aplikasi (untuk UI) | `Pake Mail` |
| `NEXT_PUBLIC_APP_URL` | URL publik aplikasi | `http://localhost:3000` |
| `NODE_ENV` | Environment mode | `development` / `staging` / `production` |

### 7.2 Batch Default Configuration

| Variabel | Deskripsi | Default |
|---|---|---|
| `DEFAULT_DELAY_SECONDS` | Delay default antar email (detik) | `45` |
| `DEFAULT_ACTIVE_HOURS_START` | Jam aktif mulai (HH:mm) | `08:00` |
| `DEFAULT_ACTIVE_HOURS_END` | Jam aktif selesai (HH:mm) | `17:00` |
| `DEFAULT_ACTIVE_DAYS` | Hari aktif (string comma-separated 0-6, 0=Minggu) | `1,2,3,4,5` (Senin-Jumat) |
| `DEFAULT_RETRY_MAX` | Maksimal retry default | `2` |
| `DEFAULT_AUTO_STOP_THRESHOLD` | Threshold failure rate auto-stop (%) | `30` (30%) |
| `MAX_FILE_SIZE_MB` | Maksimal ukuran file upload | `10` (MB) |
| `ALLOWED_FILE_TYPES` | Format file yang diizinkan | `.pdf,.docx,.jpg,.png` |

---

## 8. Deployment — Vercel

| Variabel | Deskripsi | Sumber |
|---|---|---|
| `VERCEL_TOKEN` | Vercel API token (untuk CI/CD) | [Vercel Dashboard > Settings > Tokens](https://vercel.com/account/tokens) |
| `VERCEL_PROJECT_ID` | Project ID di Vercel | Vercel Dashboard > Project > Settings > General |
| `VERCEL_ORG_ID` | Team/Organization ID | Vercel Dashboard > Team > Settings |

Semua environment variable di atas perlu ditambahkan di **Vercel Dashboard > Project > Settings > Environment Variables**.

---

## 9. Template File `.env` — untuk Development

Buat file `.env` di root project (sudah digitignore). Copy template berikut:

```env
# ============================================================
# PAKE MAIL V1 — Environment Variables Template
# ============================================================

# ---- Database (Supabase / PostgreSQL) ----
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres"
SUPABASE_URL="https://YOUR_REF.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# ---- Redis (Upstash) ----
REDIS_URL="redis://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379"

# ---- Object Storage (Cloudflare R2 / AWS S3) ----
STORAGE_BUCKET_NAME="pakemail-documents"
STORAGE_ACCESS_KEY_ID="YOUR_ACCESS_KEY"
STORAGE_SECRET_ACCESS_KEY="YOUR_SECRET_KEY"
STORAGE_ENDPOINT="https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
STORAGE_REGION="auto"

# ---- Google OAuth 2.0 ----
GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-YOUR_CLIENT_SECRET"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/callback/google"

# ---- OAuth Token Encryption ----
OAUTH_TOKEN_ENCRYPTION_KEY="YOUR_32_BYTE_HEX_KEY"

# ---- NextAuth.js (Auth.js) ----
AUTH_SECRET="YOUR_AUTH_SECRET"
AUTH_URL="http://localhost:3000"
AUTH_GOOGLE_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-YOUR_CLIENT_SECRET"

# ---- BullMQ (Job Queue) ----
BULL_QUEUE_NAME="email-batch-queue"
BULL_CONCURRENCY=5
BULL_DEFAULT_RETRY_DELAY=60000
BULL_MAX_RETRIES=3

# ---- App Configuration ----
NEXT_PUBLIC_APP_NAME="Pake Mail"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# ---- Batch Defaults ----
DEFAULT_DELAY_SECONDS=45
DEFAULT_ACTIVE_HOURS_START="08:00"
DEFAULT_ACTIVE_HOURS_END="17:00"
DEFAULT_ACTIVE_DAYS="1,2,3,4,5"
DEFAULT_RETRY_MAX=2
DEFAULT_AUTO_STOP_THRESHOLD=30
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=".pdf,.docx,.jpg,.png"
```

> **⚠️ PENTING:** Jangan commit file `.env` ke repository. File `.env` sudah di-ignore oleh `.gitignore`. Buat file `.env.example` (tanpa nilai real) sebagai referensi untuk developer lain.

---

## 10. Daftar Layanan Eksternal & Akun yang Perlu Disiapkan

| # | Layanan | Keperluan | Biaya |
|---|---|---|---|
| 1 | [Supabase](https://supabase.com) | Database PostgreSQL + Auth (opsional) | Free tier available (500MB DB) |
| 2 | [Upstash](https://upstash.com) | Redis untuk BullMQ queue | Free tier available (10MB) |
| 3 | [Cloudflare R2](https://cloudflare.com) atau [AWS S3](https://aws.amazon.com/s3) | Storage dokumen | R2 free 10GB / S3 pay-as-you-go |
| 4 | [Google Cloud Console](https://console.cloud.google.com) | OAuth 2.0 + Gmail API activation | Free (quota terbatas) |
| 5 | [Vercel](https://vercel.com) | Deployment frontend + API | Free tier (Hobby) cukup untuk dev |
| 6 | [GitHub](https://github.com) | Repository + CI/CD | Free |

---

## 11. Ringkasan Environment Variables — Semua Variabel

Berikut daftar lengkap environment variable yang akan ada di `.env`:

| # | Variabel | Required untuk Fase | Kategori |
|---|---|---|---|
| 1 | `DATABASE_URL` | Fase 0 | Database |
| 2 | `SUPABASE_URL` | Fase 0 | Database |
| 3 | `SUPABASE_ANON_KEY` | Fase 0 | Database |
| 4 | `SUPABASE_SERVICE_ROLE_KEY` | Fase 0 | Database |
| 5 | `REDIS_URL` | Fase 0 | Queue |
| 6 | `STORAGE_BUCKET_NAME` | Fase 0 | Storage |
| 7 | `STORAGE_ACCESS_KEY_ID` | Fase 0 | Storage |
| 8 | `STORAGE_SECRET_ACCESS_KEY` | Fase 0 | Storage |
| 9 | `STORAGE_ENDPOINT` | Fase 0 | Storage |
| 10 | `STORAGE_REGION` | Fase 0 | Storage |
| 11 | `GOOGLE_CLIENT_ID` | Fase 1 | OAuth |
| 12 | `GOOGLE_CLIENT_SECRET` | Fase 1 | OAuth |
| 13 | `GOOGLE_REDIRECT_URI` | Fase 1 | OAuth |
| 14 | `OAUTH_TOKEN_ENCRYPTION_KEY` | Fase 1 | Keamanan |
| 15 | `AUTH_SECRET` | Fase 1 | Auth |
| 16 | `AUTH_URL` | Fase 1 | Auth |
| 17 | `AUTH_GOOGLE_ID` | Fase 1 | Auth |
| 18 | `AUTH_GOOGLE_SECRET` | Fase 1 | Auth |
| 19 | `BULL_QUEUE_NAME` | Fase 3 | Queue |
| 20 | `BULL_CONCURRENCY` | Fase 3 | Queue |
| 21 | `BULL_DEFAULT_RETRY_DELAY` | Fase 3 | Queue |
| 22 | `BULL_MAX_RETRIES` | Fase 3 | Queue |
| 23 | `NEXT_PUBLIC_APP_NAME` | Fase 0 | App |
| 24 | `NEXT_PUBLIC_APP_URL` | Fase 0 | App |
| 25 | `NODE_ENV` | Fase 0 | App |
| 26 | `DEFAULT_DELAY_SECONDS` | Fase 3 | Batch Config |
| 27 | `DEFAULT_ACTIVE_HOURS_START` | Fase 3 | Batch Config |
| 28 | `DEFAULT_ACTIVE_HOURS_END` | Fase 3 | Batch Config |
| 29 | `DEFAULT_ACTIVE_DAYS` | Fase 3 | Batch Config |
| 30 | `DEFAULT_RETRY_MAX` | Fase 3 | Batch Config |
| 31 | `DEFAULT_AUTO_STOP_THRESHOLD` | Fase 3 | Batch Config |
| 32 | `MAX_FILE_SIZE_MB` | Fase 2 | App Config |
| 33 | `ALLOWED_FILE_TYPES` | Fase 2 | App Config |
