# Project Phasing — Pake Mail V1

**Terkait:** PRD-PakeMail-v1.md, pakemail-erd.mermaid, schema.prisma
**Tujuan dokumen:** Memecah pengerjaan V1 menjadi fase-fase yang berurutan secara teknis (bukan sekadar daftar modul), supaya tim tahu apa yang harus selesai duluan sebelum bisa mulai fase berikutnya.

---

## Prinsip Urutan Pengerjaan

Urutan fase di bawah **tidak mengikuti urutan modul di PRD**, tapi mengikuti **urutan ketergantungan teknis**. Alasannya:

- Batch Lamaran tidak bisa dites tanpa Email Account, Template, Dokumen, dan Recipient sudah ada duluan.
- Infrastruktur job queue (untuk delay/retry/scheduler) perlu dibangun sebelum fitur pengiriman apa pun bisa berjalan realistis — bukan ditambahkan belakangan sebagai "penyempurnaan".
- Modul yang murni CRUD (Profile, Document, Template, Recipient) bisa dikerjakan paralel karena tidak saling bergantung satu sama lain.

---

## Ringkasan Fase

| Fase | Nama | Fokus | Estimasi* |
|---|---|---|---|
| 0 | Fondasi Proyek | Setup infrastruktur & arsitektur dasar | 1 minggu |
| 1 | Autentikasi & Koneksi Email | Login user + OAuth Gmail | 1–1.5 minggu |
| 2 | Modul Data Reusable | Profile, Document Library, Template, Recipient | 2 minggu |
| 3 | Mesin Batch (Core) | Wizard batch + job queue + logika pengiriman | 2–2.5 minggu |
| 4 | Monitoring & Status | Realtime tracking, update status manual | 1 minggu |
| 5 | QA, Hardening & Beta | Testing menyeluruh, keamanan, uji coba user asli | 1–1.5 minggu |

*Estimasi berasumsi tim kecil (1–2 developer full-stack). Sesuaikan dengan kapasitas tim sebenarnya — angka ini indikatif, bukan komitmen.

---

## Fase 0 — Fondasi Proyek

**Tujuan:** Menyiapkan kerangka teknis supaya semua fase berikutnya bisa dibangun di atas fondasi yang sama, bukan ad-hoc.

**Deliverable:**
- Repository + struktur folder (Next.js + TypeScript)
- Database PostgreSQL tersambung + `schema.prisma` awal ter-migrate
- Redis + BullMQ terpasang (walau belum ada job nyata)
- Storage dokumen (S3/R2) tersambung dengan bucket privat
- Environment config (`.env`) untuk dev/staging/production
- Pipeline deployment dasar (Vercel + database managed)

**Kenapa duluan:** Tanpa ini, setiap modul berikutnya akan dibangun di atas fondasi yang berbeda-beda dan harus dirapikan ulang belakangan.

**Definition of Done:**
- [ ] `npm run dev` jalan tanpa error dengan koneksi DB aktif
- [ ] Satu API route contoh berhasil baca/tulis ke database
- [ ] Deployment awal (halaman kosong) berhasil diakses via URL publik

---

## Fase 1 — Autentikasi & Koneksi Email

**Tujuan:** User bisa login dan menghubungkan akun Gmail — dua hal yang jadi syarat mutlak sebelum modul lain punya arti.

**Deliverable:**
- Sistem login/register user
- Modul **Email Account**: OAuth Gmail (`gmail.send`, `gmail.readonly`), multi-akun, set default sender, disconnect
- Enkripsi token OAuth saat disimpan (FR-1.1–1.5, NFR Keamanan)
- Tampilan estimasi limit harian pengiriman

**Kenapa di awal, bukan di akhir:** Modul Batch di Fase 3 tidak bisa diuji dengan pengiriman email sungguhan tanpa ini. Menunda OAuth Gmail ke akhir proyek berisiko besar karena integrasi OAuth pihak ketiga sering punya kejutan teknis (verifikasi app, scope, consent screen Google) yang butuh waktu ekstra untuk diselesaikan — lebih baik ketahuan risikonya di awal.

**Definition of Done:**
- [ ] User baru bisa register/login
- [ ] User bisa connect akun Gmail dan sistem berhasil mengirim 1 email uji coba lewat Gmail API
- [ ] Token tersimpan terenkripsi, bukan plain text

---

## Fase 2 — Modul Data Reusable

**Tujuan:** Membangun seluruh "bahan baku" yang nanti dipakai Batch Lamaran. Empat modul ini independen satu sama lain sehingga **bisa dikerjakan paralel** jika ada lebih dari satu developer.

**Deliverable:**
- **Profile** — form data pribadi/kontak/pendidikan/pengalaman + variable engine (`{{full_name}}`, dst.)
- **Document Library** — upload, tag kategori, preview, rename, replace, delete
- **Template Email** — subject/body/penutup, variable picker, preview, clone, favorite
- **Recipient Management** — CRUD perusahaan, import/export CSV, search/filter, duplicate detection (`@@unique([userId, hrEmail])`)

**Kenapa setelah Fase 1, sebelum Fase 3:** Batch Lamaran (Fase 3) memilih data dari keempat modul ini di setiap langkah wizard-nya. Tanpa data nyata di sini, wizard batch tidak bisa diuji dengan skenario realistis.

**Definition of Done:**
- [ ] User bisa mengisi Profile lengkap dan variable-nya terbaca sistem
- [ ] User bisa upload minimal 3 dokumen dengan kategori berbeda
- [ ] User bisa membuat template dan preview-nya menampilkan data Profile yang benar
- [ ] User bisa menambah 20+ perusahaan (manual & CSV) tanpa duplikat lolos

---

## Fase 3 — Mesin Batch (Core Module)

**Tujuan:** Ini jantung aplikasi — menyatukan semua modul sebelumnya menjadi satu alur pengiriman nyata.

**Deliverable:**
- Wizard batch 7 langkah (FR-6.1–6.8)
- Job queue (BullMQ) yang menjadwalkan pengiriman per `BatchRecipient`, menghormati delay, jam aktif, hari aktif
- Worker pengiriman email (Gmail API `messages.send`) dengan lampiran dari Document Library dan variable ter-render dari Template + Profile + Recipient
- State machine status batch: `Draft → Scheduled → Running → Paused → Completed/Stopped/Failed`
- Retry otomatis untuk error transient
- Auto-stop saat failure rate melewati threshold

**Kenapa ini fase tersendiri, bukan digabung ke fase lain:** Ini bagian paling kompleks secara teknis (job queue persistent, retry logic, rate limiting terhadap Gmail) dan paling berisiko kalau terburu-buru — auto-stop dan delay yang salah implementasi bisa membuat akun Gmail user di-suspend Google. Fase ini butuh waktu pengujian lebih lama dibanding modul CRUD biasa.

**Definition of Done:**
- [ ] User bisa menyelesaikan wizard batch untuk 10 perusahaan dan email benar-benar terkirim sesuai jadwal & delay
- [ ] Retry otomatis terbukti bekerja saat disimulasikan error
- [ ] Auto-stop terbukti menghentikan batch saat failure rate disimulasikan tinggi
- [ ] Pause/resume/stop batch berfungsi tanpa merusak data status penerima

---

## Fase 4 — Monitoring & Status Tracking

**Tujuan:** Memberi visibilitas atas apa yang terjadi di Fase 3 secara real-time, dan memungkinkan user memperbarui status lamaran.

**Deliverable:**
- Halaman detail batch: breakdown Pending/Sent/Retry/Failed/Skipped/Remaining/ETA (FR-6.15)
- Log pengiriman per perusahaan (FR-6.16)
- Update status manual per perusahaan (Applied → Reply → Interview, dst.) (FR-6.17)
- Log aktivitas dasar (basis Activity Log)

**Kenapa setelah Fase 3, bukan digabung:** Monitoring baru punya data untuk ditampilkan setelah mesin pengiriman di Fase 3 benar-benar menghasilkan data status. Membangunnya lebih awal berarti bekerja dengan data dummy yang harus dirombak ulang.

**Definition of Done:**
- [ ] Status batch di layar monitoring update real-time (atau near-real-time) saat email terkirim
- [ ] User bisa klik satu perusahaan dan melihat log pengirimannya
- [ ] User bisa mengubah status lamaran manual dan tersimpan dengan benar

---

## Fase 5 — QA, Hardening & Beta

**Tujuan:** Memastikan aplikasi aman dan stabil dipakai oleh user sungguhan sebelum rilis resmi.

**Deliverable:**
- Pengujian end-to-end untuk seluruh alur (dari connect Gmail sampai batch selesai)
- Uji ketahanan job queue (restart server saat batch sedang berjalan — job tidak boleh hilang)
- Review keamanan: enkripsi token, akses storage dokumen privat, rate limiting endpoint publik
- Uji coba terbatas (beta) dengan beberapa user asli, kumpulkan feedback
- Perbaikan bug dari hasil beta

**Kenapa di akhir:** QA menyeluruh baru bisa dilakukan setelah seluruh alur (Fase 0–4) tersambung utuh; melakukan hardening sebelum semua modul selesai berisiko harus diulang.

**Definition of Done:**
- [ ] Checklist §14 di PRD (Definition of Done V1) terpenuhi semua
- [ ] Tidak ada bug kritikal terbuka dari sesi beta
- [ ] Server restart di tengah batch berjalan tidak menghilangkan job yang tersisa

---

## Setelah V1: Fase Lanjutan

Fase-fase di atas menghasilkan V1 yang bisa dipakai penuh. Pengembangan setelahnya mengikuti roadmap yang sudah ditetapkan di PRD §13, masing-masing diperlakukan sebagai siklus fase serupa (fondasi → build → QA):

| Rilis | Fokus Utama |
|---|---|
| **V1.1** | Login Outlook, Dashboard ringkasan, Follow Up Reminder |
| **V1.2** | Replies module (auto-fetch balasan), Job Pipeline penuh, Smart Attachment otomatis |
| **V1.3+** | Analytics mendalam, Activity Log penuh, Settings global, AI Summary balasan |

---

## Catatan Penting

- Fase 2 adalah satu-satunya fase yang idealnya dikerjakan **paralel** kalau tim lebih dari 1 developer — sisanya sengaja berurutan karena ketergantungan teknis langsung, memaksakan paralel di fase lain berisiko rework.
- Fase 3 (Mesin Batch) adalah titik risiko tertinggi di seluruh proyek — alokasikan buffer waktu ekstra di sini, bukan di fase-fase CRUD yang lebih mudah diprediksi.
- Dokumen ini adalah rencana kerja, bukan kontrak waktu tetap — estimasi di §Ringkasan Fase sebaiknya divalidasi ulang begitu tim dan tooling sebenarnya sudah ditentukan.
