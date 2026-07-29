# Product Requirements Document (PRD)
## Pake Mail (PM) — Platform Manajemen Pengiriman Lamaran Kerja via Email

**Versi Dokumen:** 1.0
**Status:** Draft untuk Review
**Scope Rilis:** V1 (MVP)

---

## 1. Ringkasan Eksekutif

Pake Mail adalah platform yang membantu pencari kerja mengelola seluruh proses pengiriman lamaran kerja melalui email secara cepat, terstruktur, aman, dan mudah dipantau. Aplikasi ini bukan sekadar "email blast", melainkan pusat manajemen aktivitas melamar kerja — mulai dari menyimpan profil dan dokumen, menyusun template, mengelola database perusahaan, hingga mengelompokkan pengiriman ke dalam **Batch Lamaran** sebagai inti sistem.

**Prinsip produk (fondasi arsitektur):**
> Semua aktivitas berpusat pada *Batch Lamaran*, sementara data pendukung (profil, dokumen, template, perusahaan, akun email) bersifat *reusable*. User cukup setup sekali, lalu setiap kali melamar cukup membuat batch baru dari aset yang sudah ada.

---

## 2. Latar Belakang & Masalah

Pencari kerja (fresh graduate, job seeker aktif, career switcher, freelancer) umumnya mengirim lamaran secara manual: copy-paste email berulang-ulang, salah lampiran CV, lupa perusahaan mana yang sudah dilamar, dan tidak tahu status balasan tanpa mengecek inbox satu per satu. Proses ini lambat, rawan human error, dan sulit dievaluasi.

**Masalah inti yang diselesaikan:**
- Repetisi manual saat mengirim lamaran ke puluhan/ratusan perusahaan.
- Tidak ada sistem pelacakan status lamaran per perusahaan.
- Tidak ada cara mudah mengelola berbagai versi CV/dokumen untuk posisi berbeda.
- Tidak ada visibilitas atas performa strategi melamar (reply rate, template mana yang efektif, dll).

---

## 3. Target User & Persona

| Persona | Kebutuhan Utama |
|---|---|
| **Fresh Graduate** | Kirim lamaran ke puluhan perusahaan dengan 1 CV/template umum |
| **Job Seeker Aktif** | Kirim lamaran rutin, butuh tracking status yang rapi |
| **Career Switcher** | Kelola beberapa CV berbeda untuk posisi/bidang berbeda |
| **Freelancer** | Kirim proposal ke banyak calon client (use case adjacent) |

---

## 4. Tujuan User (Core Job-to-be-Done)

> "Saya ingin mengirim lamaran ke banyak perusahaan tanpa harus copy-paste email satu per satu."

Semua fitur di aplikasi ini adalah alat untuk mencapai tujuan tersebut secara cepat dan terpantau.

---

## 5. Tujuan Produk & Success Metrics (V1)

| Tujuan | Metrik |
|---|---|
| Mempercepat proses pengiriman lamaran massal | Waktu rata-rata membuat & mengirim 1 batch (target < 5 menit setup untuk 50 perusahaan) |
| Mengurangi kesalahan pengiriman (lampiran salah, dsb) | Tingkat error/salah lampiran mendekati 0% (via Smart Attachment) |
| Memberi visibilitas status lamaran | 100% batch memiliki status real-time yang akurat |
| Retensi penggunaan berulang | User membuat >1 batch baru dalam 30 hari pertama |

---

## 6. Ruang Lingkup (Scope)

### 6.1 In-Scope V1 (MVP)
Berdasarkan prioritas, V1 mencakup 5 modul dasar yang saling terhubung, ditambah 1 modul dependency wajib:

1. **Email Account** *(dependency wajib — tanpa ini Batch tidak bisa mengirim apa pun)*
2. **Profile**
3. **Document Library**
4. **Template Email**
5. **Recipient Management** (database perusahaan)
6. **Batch Lamaran** (termasuk Scheduler dasar & Monitoring dasar sebagai bagian dari lifecycle batch)

### 6.2 Out-of-Scope V1 (Roadmap Selanjutnya)
- Dashboard analitik ringkasan (Modul 1)
- Replies management terpusat / thread viewer (Modul 10)
- Job Pipeline drag-and-drop (Modul 11)
- Activity Log terpisah sebagai modul penuh (V1 hanya log dasar per batch)
- Analytics mendalam (Modul 13)
- Settings global lengkap (V1 hanya settings minimal yang menempel di masing-masing modul)
- Fitur pintar: Company History, Follow Up Reminder otomatis, AI Summary
- Recurring schedule, multi-timezone kompleks

> Catatan: Duplicate Prevention di Recipient Management **tetap masuk V1** dalam bentuk sederhana karena merupakan kebutuhan dasar integritas data, bukan fitur "nice to have".

---

## 7. Alur Pengguna Utama (V1 User Flow)

```
Login / Register
      │
      ▼
Hubungkan akun Gmail (OAuth) ──> [Blocking gate: tanpa ini, Batch tidak bisa dibuat]
      │
      ▼
Isi Profile (identitas, kontak, pendidikan, pengalaman)
      │
      ▼
Upload dokumen ke Document Library (CV, Portfolio, dst)
      │
      ▼
Buat Template Email (dengan variable dari Profile)
      │
      ▼
Tambah / Import perusahaan ke Recipient Management
      │
      ▼
Buat Batch Lamaran:
   Nama → Pilih Akun Email → Pilih Template →
   Pilih Dokumen → Pilih Perusahaan → Atur Jadwal → Preview
      │
      ▼
Kirim / Jadwalkan Batch
      │
      ▼
Monitoring progres pengiriman (real-time)
      │
      ▼
Update status lamaran (manual, V1 belum auto-detect reply)
```

---

## 8. Functional Requirements per Modul

### 8.1 Modul: Email Account *(dependency)*

**Tujuan:** Menghubungkan akun pengirim email agar sistem dapat mengirim atas nama user.

**Requirements:**
- FR-1.1: User dapat menghubungkan akun **Gmail** via OAuth 2.0 (scope: `gmail.send`, `gmail.readonly` minimal untuk mengecek limit/bounce).
- FR-1.2: User dapat menghubungkan lebih dari satu akun (multi-account), diberi label bebas (mis. `gmail_pribadi`, `gmail_kerja`).
- FR-1.3: User dapat memilih salah satu akun sebagai **default sender**.
- FR-1.4: Sistem menampilkan estimasi limit harian pengiriman (Gmail API quota ± 500/hari untuk akun gratis — ditampilkan sebagai estimasi, bukan garansi).
- FR-1.5: User dapat memutus koneksi (disconnect) akun kapan saja; batch yang sedang berjalan dengan akun tsb akan di-pause otomatis dan user diberi notifikasi.
- FR-1.6: (Nice-to-have V1, bisa didorong ke V1.1) Login Outlook via Microsoft Graph API.

**Non-goals V1:** SMTP custom/manual (mis. Zoho, cPanel email) — didorong ke roadmap.

---

### 8.2 Modul: Profile

**Tujuan:** Menyimpan identitas user agar dapat dipanggil otomatis oleh template.

**Requirements:**
- FR-2.1: User dapat mengisi data pribadi (nama lengkap, foto opsional, tanggal lahir, alamat).
- FR-2.2: User dapat mengisi kontak (email, nomor telepon, LinkedIn, portfolio URL).
- FR-2.3: User dapat menambahkan riwayat pendidikan (institusi, jenjang, jurusan, tahun).
- FR-2.4: User dapat menambahkan riwayat pengalaman kerja (perusahaan, posisi, durasi, deskripsi).
- FR-2.5: Setiap field profil tersedia sebagai variable template, format `{{field_name}}`, contoh: `{{full_name}}`, `{{phone}}`, `{{email}}`, `{{portfolio}}`.
- FR-2.6: Sistem menampilkan daftar variable yang tersedia saat user mengedit template (variable picker).

---

### 8.3 Modul: Document Library

**Tujuan:** Tempat penyimpanan seluruh dokumen lamaran agar tidak perlu upload ulang setiap batch.

**Requirements:**
- FR-3.1: User dapat upload dokumen (format: PDF, DOCX, JPG/PNG untuk portofolio; maks ukuran file dikonfigurasi, mis. 10MB/file).
- FR-3.2: User dapat memberi nama/label bebas pada dokumen (mis. "CV Frontend", "CV Operator").
- FR-3.3: User dapat men-tag dokumen dengan kategori (CV, Portfolio, Ijazah, SKCK, Transkrip, Lainnya) — kategori ini yang menjadi basis fitur *Smart Attachment* di roadmap selanjutnya.
- FR-3.4: User dapat preview dokumen langsung di aplikasi tanpa download.
- FR-3.5: User dapat rename, replace (upload versi baru menggantikan file lama tanpa mengubah referensi di batch lama), dan delete dokumen.
- FR-3.6: Sistem mencegah penghapusan dokumen yang sedang dipakai di batch yang **masih berjalan** (soft warning + konfirmasi).
- FR-3.7 *(opsional V1, bisa disederhanakan)*: Versioning dasar — menyimpan riwayat file lama saat replace, minimal 1 versi sebelumnya.

---

### 8.4 Modul: Template Email

**Tujuan:** Menyimpan template email yang reusable dan dinamis lewat variable.

**Requirements:**
- FR-4.1: User dapat membuat template dengan komponen: Subject, Body (rich text/plain text), Penutup (signature block).
- FR-4.2: Template mendukung variable dari Profile (`{{full_name}}`, dst) dan variable kontekstual dari Recipient (`{{company}}`, `{{position}}`).
- FR-4.3: User dapat preview template dengan data contoh sebelum dipakai di batch.
- FR-4.4: User dapat clone template menjadi versi baru.
- FR-4.5: User dapat menandai template sebagai favorite untuk akses cepat.
- FR-4.6: Sistem melakukan validasi dasar: menandai jika ada variable di template yang tidak memiliki data terisi di Profile (mencegah email terkirim dengan `{{full_name}}` kosong/literal).

---

### 8.5 Modul: Recipient Management (Database Perusahaan)

**Tujuan:** Menyimpan dan mengelola daftar perusahaan tujuan lamaran.

**Requirements:**
- FR-5.1: User dapat menambah perusahaan secara manual dengan data: Nama PT, Email HR, Posisi, Lokasi, Website, Sumber informasi, Catatan, Tag, Status.
- FR-5.2: User dapat **import** daftar perusahaan via CSV (dengan template CSV yang disediakan sistem dan validasi format).
- FR-5.3: User dapat **export** daftar perusahaan ke CSV.
- FR-5.4: User dapat search & filter (by status, tag, lokasi, posisi).
- FR-5.5: Sistem melakukan **duplicate detection** berdasarkan email HR: jika email sudah ada, tampilkan opsi *Gabungkan / Lewati / Tetap Simpan*.
- FR-5.6: Setiap perusahaan memiliki riwayat lamaran (log batch mana saja yang pernah mengirim ke perusahaan ini) — versi sederhana dari Modul Company History.
- FR-5.7: User dapat mengedit dan menghapus data perusahaan (dengan warning jika sudah pernah dipakai di batch).

---

### 8.6 Modul: Batch Lamaran (Core Module)

**Tujuan:** Mengelompokkan satu sesi pengiriman lamaran dan menjadi pusat orkestrasi seluruh modul lain.

**Requirements — Setup Batch (wizard 7 langkah):**
- FR-6.1: Step 1 — User memberi nama & deskripsi batch (mis. "Operator Bekasi").
- FR-6.2: Step 2 — User memilih akun email pengirim (dari Modul Email Account).
- FR-6.3: Step 3 — User memilih template email (dari Modul Template).
- FR-6.4: Step 4 — User memilih dokumen lampiran (dari Document Library; bisa multi-select).
- FR-6.5: Step 5 — User memilih daftar perusahaan tujuan (dari Recipient Management; bisa filter/select-all/select manual).
- FR-6.6: Step 6 — User mengatur jadwal: kirim sekarang atau jadwalkan (tanggal + jam mulai), delay antar email (mis. 30–120 detik untuk menghindari flag spam), jam aktif pengiriman (mis. 08.00–17.00), hari aktif (Senin–Jumat).
- FR-6.7: Step 7 — Preview: menampilkan simulasi email final (dengan variable ter-render) untuk minimal 1 sample perusahaan, plus ringkasan total penerima, dokumen terlampir, dan estimasi waktu selesai.
- FR-6.8: User dapat mulai (submit) batch setelah preview, atau menyimpan sebagai Draft untuk dilanjutkan nanti.

**Requirements — Lifecycle & Eksekusi:**
- FR-6.9: Status batch mengikuti state machine: `Draft → Scheduled → Running → Paused → Completed / Stopped / Failed`.
- FR-6.10: Sistem mengirim email sesuai delay & jam aktif yang dikonfigurasi (via job queue, lihat §11).
- FR-6.11: Sistem melakukan retry otomatis (maks N kali, dikonfigurasi, default 2x) untuk email yang gagal terkirim karena error transient (timeout, rate limit).
- FR-6.12: **Auto Stop**: batch otomatis berhenti jika bounce rate atau failure rate melewati threshold (mis. >30% gagal dari 20 email pertama) untuk mencegah akun email di-flag/suspend oleh provider.
- FR-6.13: User dapat pause dan resume batch yang sedang running.
- FR-6.14: User dapat menghentikan (stop) batch kapan saja; sisa perusahaan yang belum terkirim akan berstatus `Skipped`.

**Requirements — Monitoring (embedded dalam Batch, versi dasar dari Modul 9):**
- FR-6.15: Halaman detail batch menampilkan breakdown real-time: Pending, Sent, Retry, Failed, Skipped, Remaining, dan estimasi waktu selesai (ETA).
- FR-6.16: User dapat klik satu perusahaan dalam batch untuk melihat log pengiriman individual (waktu kirim, status, error message jika gagal).
- FR-6.17: User dapat secara manual mengubah status lamaran per perusahaan (mis. Applied → Reply → Interview) dari layar monitoring batch — sebagai versi minimal dari Job Pipeline (Modul 11 penuh masuk roadmap).

---

## 9. Model Data (Entitas Utama V1)

```
User
 ├── EmailAccount (1..N)
 ├── Profile (1)
 ├── Document (1..N)
 ├── EmailTemplate (1..N)
 ├── Recipient/Company (1..N)
 └── Batch (1..N)
       ├── ref: EmailAccount
       ├── ref: EmailTemplate
       ├── ref: Document (many-to-many)
       ├── ref: Recipient (many-to-many, via BatchRecipient)
       └── BatchRecipient (join entity)
             ├── status (Draft/Sent/Failed/Skipped/Applied/Reply/Interview/...)
             ├── sent_at, error_log, retry_count
```

**Catatan desain:** `BatchRecipient` adalah entitas penghubung penting — ini yang menyimpan status pengiriman *per perusahaan per batch*, sekaligus menjadi basis untuk riwayat lamaran per perusahaan (FR-5.6) dan monitoring (FR-6.15–6.17).

---

## 10. Kebutuhan Non-Fungsional

| Kategori | Requirement |
|---|---|
| **Keamanan** | Token OAuth disimpan terenkripsi (at-rest encryption); tidak pernah menyimpan password email user secara langsung; komunikasi API via HTTPS; rate limiting pada endpoint publik. |
| **Kepatuhan Provider** | Menghormati batas kuota Gmail API & kebijakan anti-spam Google (delay minimum antar kirim, auto-stop pada bounce tinggi) agar akun user tidak di-suspend. |
| **Reliabilitas** | Proses pengiriman batch harus resilient terhadap restart server (job queue persistent, bukan in-memory). |
| **Performa** | Setup batch untuk 100+ perusahaan harus tetap responsif (< 2 detik render halaman preview). |
| **Skalabilitas** | Arsitektur job queue harus mampu menangani banyak batch berjalan paralel dari user berbeda. |
| **Audit** | Setiap pengiriman email dicatat dengan timestamp untuk keperluan debugging (basis Activity Log di roadmap). |
| **Privasi Data** | Dokumen (CV dll) disimpan di storage privat, tidak publicly accessible tanpa signed URL/auth. |

---

## 11. Rekomendasi Arsitektur & Tech Stack

Karena kebutuhan menonjol V1 adalah: OAuth integration, pengiriman email terjadwal dengan delay/retry, dan job yang harus tahan restart — berikut rekomendasi stack:

| Layer | Rekomendasi | Alasan |
|---|---|---|
| Frontend | **Next.js (React) + TypeScript** | SSR untuk dashboard yang cepat, ekosistem besar, mudah cari developer |
| Styling | Tailwind CSS | Cepat untuk membangun UI form-heavy (wizard batch, dsb) |
| Backend | **Node.js (Next.js API routes atau Express terpisah)** | Satu bahasa dgn frontend, ekosistem library Gmail/Outlook API matang |
| Database | **PostgreSQL** | Relasional kuat untuk model data batch-recipient yang kompleks |
| ORM | Prisma | Type-safe, migrasi mudah |
| Job Queue | **BullMQ + Redis** | Wajib untuk scheduler & delay antar email yang persistent, mendukung retry native |
| Auth Provider | Google OAuth 2.0 (Gmail API), Microsoft Identity Platform (Outlook, V1.1) | Native, tidak perlu SMTP manual |
| Storage Dokumen | S3-compatible object storage (mis. AWS S3 / Cloudflare R2) | Privat, scalable, signed URL |
| Deployment | Vercel (frontend/API) + managed Postgres/Redis (mis. Railway/Supabase/Upstash) | Cepat untuk MVP, minim DevOps overhead |

**Alur teknis pengiriman batch (ringkas):**
1. Saat user submit batch → sistem membuat job per `BatchRecipient` di antrian (BullMQ), dijadwalkan sesuai delay & jam aktif.
2. Worker mengambil job, memanggil Gmail API `messages.send` menggunakan token OAuth akun terkait, dengan dokumen terlampir dari storage.
3. Hasil (sukses/gagal) ditulis kembali ke `BatchRecipient.status` + realtime update ke frontend (via polling atau WebSocket/SSE sederhana untuk V1).
4. Auto-stop checker berjalan setiap batch N email terkirim untuk mengevaluasi failure rate.

---

## 12. Risiko & Asumsi

| Risiko | Mitigasi |
|---|---|
| Akun Gmail user kena flag/suspend karena volume kirim tinggi | Delay antar email wajib, auto-stop, edukasi limit harian di UI |
| Gmail API quota terbatas untuk akun gratis | Tampilkan estimasi limit secara jelas, dorong user pakai Google Workspace bila volume besar |
| User upload dokumen sensitif (Ijazah, SKCK) | Storage privat + enkripsi + access control ketat |
| Import CSV dengan data kotor/duplikat | Validasi & duplicate detection wajib sebelum data masuk (FR-5.2, FR-5.5) |
| Ketergantungan pada satu provider (Gmail) di V1 | Outlook didorong ke V1.1 sebagai mitigasi vendor lock-in |

**Asumsi:**
- User sudah memiliki akun Gmail aktif sebelum mulai pakai aplikasi.
- V1 tidak menangani auto-deteksi balasan email (Replies/Modul 10) — update status masih manual.
- V1 single-user per akun (belum ada fitur tim/kolaborasi).

---

## 13. Roadmap Setelah V1

**V1.1**
- Login Outlook (Microsoft Graph)
- Dashboard ringkasan (Modul 1)
- Follow Up Reminder (pengingat, bukan otomatis kirim)

**V1.2**
- Replies module — auto-fetch balasan via Gmail API, thread viewer
- Job Pipeline penuh (drag-and-drop antar status)
- Smart Attachment otomatis berdasarkan posisi/tag dokumen

**V1.3+**
- Analytics mendalam (reply rate, template performance, dsb)
- Activity Log sebagai modul penuh
- Settings global lengkap
- AI Summary balasan email

---

## 14. Ringkasan Prioritas V1 (Definition of Done)

Rilis V1 dianggap selesai jika:
- [ ] User dapat menghubungkan minimal 1 akun Gmail via OAuth.
- [ ] User dapat mengisi Profile dan variable-nya terpakai otomatis di template.
- [ ] User dapat upload & kelola dokumen di Document Library.
- [ ] User dapat membuat, preview, dan clone Template Email.
- [ ] User dapat menambah perusahaan manual maupun import CSV, dengan duplicate detection aktif.
- [ ] User dapat membuat Batch Lamaran lengkap (7 step wizard) dan mengirim/menjadwalkannya.
- [ ] User dapat memantau progres batch secara real-time (sent/failed/pending/remaining/ETA).
- [ ] User dapat mengubah status lamaran per perusahaan secara manual.
- [ ] Sistem menerapkan delay, retry, dan auto-stop untuk melindungi akun email user.
