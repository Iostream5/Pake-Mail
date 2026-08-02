# Pake Mail V1 — Dokumentasi Produksi

Dokumen ini menjelaskan cara setup **Google OAuth (Login + Gmail Connect)** dan daftar lengkap **environment variables** yang harus disetel saat aplikasi di-deploy ke **Vercel** (dan service pendukung: Supabase, Upstash Redis, Cloudflare R2).

> File ini untuk referensi produksi. Jangan pernah menaruh nilai kredensial nyata di sinisa — simpan semua rahasia di Vercel Environment Variables, bukan di `.env` atau kode.

---

## 1. Ringkasan Arsitektur Env

| Kebutuhan | Provider | Variabel |
|---|---|---|
| Database | Supabase / PostgreSQL | `DATABASE_URL` |
| Job queue (BullMQ) | Upstash Redis | `REDIS_URL` |
| Object storage (dokumen) | Cloudflare R2 | `STORAGE_*` |
| Login aplikasi (NextAuth) | Google OAuth | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `AUTH_URL` |
| Connect Gmail | Google OAuth scopes | `GOOGLE_REDIRECT_URI`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |
| Enkripsi token OAuth | — | `OAUTH_TOKEN_ENCRYPTION_KEY` |

Catatan penting: di aplikasi ini **satu proyek Google Cloud** dipakai sekaligus untuk:
1. **Login ke aplikasi** (via NextAuth / `lib/auth.ts`).
2. **Menghubungkan akun Gmail pengguna** untuk mengirim email (via `app/api/email-accounts/callback/route.ts`).

Kedua mekanisme memakai `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` yang sama.

---

## 2. Setup Google OAuth (Login + Gmail)

### 2.1 Buat OAuth 2.0 Client ID di Google Cloud

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → pilih / buat proyek.
2. Menu → **APIs & Services** → **OAuth consent screen**.
   - Pilih **External**, isi nama aplikasi & email.
   - **Scopes (optional)** — NextAuth login butuh `email` & `profile`. Ini biasa ditambahkan otomatis.
   - Tambahkan **gmail reads/send** untuk fitur Gmail:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.modify`
3. Menu **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**:
   - **Application type**: **Web application**
   - **Authorized JavaScript origins**: URL produksi, contoh `https://your-app.vercel.app`
   - **Authorized redirect URIs** (cuci yang penting):
     - Dari alur login — otomatis ditangani NextAuth (umumnya cukup origin + `api/auth/callback/google`).
     - Untuk koneksi Gmail (WAJIB): `https://your-app.vercel.app/api/email-accounts/callback`
4. Simpan **Client ID** dan **Client Secret**.

> Saat development lokal, tambahkan juga:
> - Redirect URI: `http://localhost:3000/api/email-accounts/callback`
> - Authorized JS origin: `http://localhost:3000`

### 2.2 Enabling Google API

Perlu mengaktifkan **Gmail API** agar `google.gmail` di callback berfungsi:
- Menu **APIs & Services** → **Library** → cari **Gmail API** → **Enable**.

---

## 3. Environment Variables — Lengkap

Isi semua variabel berikut di **Vercel → Project → Settings → Environment Variables**. Gunakan scope **Production** (dan **Preview/Development** bila butuh).

### 3.1 Kredensial Google / Auth

| Variabel | Wajib | Nilai / Cara Mendapatkan |
|---|---|---|
| `GOOGLE_CLIENT_ID` | ✅ | Dari step 2.1 (contoh: `xxxx.apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | ✅ | Dari step 2.1 (awalan `GOCSPX-...`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | ✅ | Sama dengan `GOOGLE_CLIENT_ID` (digunakan client-side) |
| `GOOGLE_REDIRECT_URI` | ✅ | `https://your-app.vercel.app/api/email-accounts/callback` |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://your-app.vercel.app` |
| `AUTH_URL` | ✅ | `https://your-app.vercel.app` (untuk produksi) |
| `AUTH_SECRET` | ✅ | Generate: `npx auth secret` atau `openssl rand -base64 32` |

### 3.2 Enkripsi Token OAuth

| Variabel | Wajib | Nilai |
|---|---|---|
| `OAUTH_TOKEN_ENCRYPTION_KEY` | ✅ | **64 karakter hex** (32 byte untuk AES-256-GCM). Generate: `openssl rand -hex 32` |

**Peringatan:** Jangan mengubah kunci ini setelah akun Gmail tersambung — token lama tidak akan bisa didekripsi.

### 3.3 Database (Supabase / PostgreSQL)

| Variabel | Wajib | Nilai |
|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres` |
| `SUPABASE_URL` | ✅ | `https://REF.supabase.co` |
| `SUPABASE_ANON_KEY` | ✅ | Dari Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Dari Supabase → Settings → API (server-side only) |

Jangan lupa migrasi schema Prisma setelah env DB siap:
```
npx prisma migrate deploy
```

### 3.4 Redis (Upstash) — BullMQ

| Variabel | Wajib | Nilai |
|---|---|---|
| `REDIS_URL` | ✅ | `redis://default:PASSWORD@ENDPOINT.upstash.io:6379` |
| `BULL_QUEUE_NAME` | opsional | `email-batch-queue` |
| `BULL_CONCURRENCY` | opsional | `5` |
| `BULL_DEFAULT_RETRY_DELAY` | opsional | `60000` |
| `BULL_MAX_RETRIES` | opsional | `3` |

> Upstash, gunakan koneksi **TLS** (`rediss://`). Redis dipakai secara **lazy** (dibangun saat runtime), jadi tidak diperlukan saat `next build`.

### 3.5 Object Storage (Cloudflare R2 / S3)

| Variabel | Wajib | Nilai |
|---|---|---|
| `STORAGE_BUCKET_NAME` | ✅ | `pakemail-documents` |
| `STORAGE_ACCESS_KEY_ID` | ✅ | Access Key R2 |
| `STORAGE_SECRET_ACCESS_KEY` | ✅ | Secret Key R2 |
| `STORAGE_ENDPOINT` | ✅ | `https://ACCOUNT_ID.r2.cloudflarestorage.com` |
| `STORAGE_REGION` | ✅ | `auto` |

### 3.6 Batch & App

| Variabel | Default | Deskripsi |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | `Pake Mail` | Nama aplikasi |
| `NODE_ENV` | Vercel set otomatis | Jangan di-override di produksi |
| `DEFAULT_DELAY_SECONDS` | `45` | Delay antar-email |
| `DEFAULT_ACTIVE_HOURS_START` | `08:00` | Jam aktif mulai |
| `DEFAULT_ACTIVE_HOURS_END` | `17:00` | Jam aktif selesai |
| `DEFAULT_ACTIVE_DAYS` | `1,2,3,4,5` | Hari aktif (Senin–Jumat) |
| `DEFAULT_RETRY_MAX` | `2` | Maks retry |
| `DEFAULT_AUTO_STOP_THRESHOLD` | `30` | Ambang auto-stop |
| `MAX_FILE_SIZE_MB` | `10` | Ukuran file maks (MB) |
| `ALLOWED_FILE_TYPES` | `.pdf,.docx,.jpg,.png` | Jenis file dokumen |

---

## 4. Cara Set di Vercel

1. Vercel Project → **Settings** → **Environment Variables**.
2. Tambahkan tiap variabel di tabel 3.1–3.5 dengan **scope Production** (dan Preview bila perlu).
3. **Deploy ulang** (redeploy) agar env baru ter-pick-up. Env Vercel **tidak** tersedia saat `next build` untuk browser elemen — karena itu nilai runtime sebelumnya harus diset sebelum menjalankan server (Redis sudah didesain lazy, aman).
4. Buka **Domains** → pastikan URL produksi sesuai `NEXT_PUBLIC_APP_URL` / `AUTH_URL` / `GOOGLE_REDIRECT_URI`.

### Cek ulang setelah deploy
- Setiap `GOOGLE_REDIRECT_URI`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL` harus memakai **domain produksi** yang persis (jangan `localhost`).
- Pastikan redirect URI di Google Cloud matches persis dengan `GOOGLE_REDIRECT_URI`.

---

## 5. Troubleshooting Umum

| Gejala | Kemungkinan Penyebab | Solusi |
|---|---|---|
| `REDIS_URL is not set` saat build | Redis diakses saat magang build | Tidak occur lagi karena queue di-buat lazy. Pastikan `REDIS_URL` ada di env produksi. |
| `OAUTH_TOKEN_ENCRYPTION_KEY not set` / "64 hex chars" | Kunci kosong/panjang salah | Generate 64 hex: `openssl rand -hex 32`. |
| Login Google "redirect_uri_mismatch" | URI redirect belum terdaftar di Google Cloud | Tambahkan persis di Authorized redirect URIs. |
| Callback Gmail balance error | `GOOGLE_REDIRECT_URI` salah / belum didaftarkan | Cocokkan benar-benar di Google cloud. |
| Token gagal di-dekripsi | `OAUTH_TOKEN_ENCRYPTION_KEY` berubah | Kunci harus tetap sama selama app hidup. |
| `AUTH_SECRET` berubah | Sesi baru selalu logout | Set nilai tetap, jangan di-generate ulang. |

---

## 6. Langkah Cepat (Checklist Produksi)

1. Buat OAuth Client di Google Cloud + tambahkan redirect URI (`/api/email-accounts/callback`). (Step 2)
2. Aktifkan Gmail API. (Step 2.2)
3. Generate `AUTH_SECRET` & `OAUTH_TOKEN_ENCRYPTION_KEY`. (Step 3.1/3.2)
4. Siapkan Supabase (database + migrate). (Step 3.3)
5. Siapkan Upstash Redis. (Step 3.4)
6. Siapkan Cloudflare R2. (Step 3.5)
7. Masukkan semua env di Vercel dan redeploy. (Step 4)