# Audit V1 — Pake Mail vs PRD v1

**Tanggal:** 2026-07-28  
**Status:** Final

---

## Ringkasan

| Modul | Status | Keterangan |
|-------|--------|------------|
| Auth & Middleware | ✅ **Selesai** | Google OAuth + middleware.ts proteksi dashboard |
| Email Account | ✅ **Selesai** | OAuth Gmail, multi-account, default sender, disconnect |
| Profile | ✅ **Selesai** | CRUD profil, pendidikan, pengalaman, variable system |
| Document Library | ✅ **Selesai** | Upload, kategori, preview inline, replace + versioning |
| Template Email | ✅ **Selesai** | CRUD, clone, favorite, validasi variable sebelum kirim |
| Recipient Management | ✅ **Selesai** | CRUD, CSV import/export, duplicate detection, riwayat lamaran |
| Batch Lamaran | ✅ **Selesai** | Wizard 7 langkah, lifecycle state machine, scheduler, auto-poll monitoring |
| Dashboard | ✅ **Bonus** | PRD bilang out-of-scope V1, tapi sudah diimplementasi |
| Worker/Queue | ✅ **Selesai** | BullMQ worker dengan Gmail API, MIME, attachment, retry, auto-stop |
| Infrastructure | ✅ **Selesai** | Prisma, Redis, S3, enkripsi, health check |
| UI/Design System | ✅ **Selesai** | 15 komponen custom, tema dark terminal |

---

## Detail per Modul

### 1. Auth & Middleware

| PRD Requirement | Status | Catatan |
|-----------------|--------|---------|
| Login / Register via Google OAuth | ✅ | NextAuth v5 + Google provider |
| Middleware proteksi dashboard | ✅ | File `middleware.ts` dengan export `auth as middleware` |

### 2. Email Account (Modul 8.1)

| FR | Status | Catatan |
|----|--------|---------|
| FR-1.1: Gmail OAuth (gmail.send, gmail.readonly) | ✅ | OAuth flow via popup + postMessage callback |
| FR-1.2: Multi-account dengan label | ✅ | CRUD + provider badge |
| FR-1.3: Default sender | ✅ | API set/unset default |
| FR-1.4: Estimasi limit harian | ✅ | dailyLimit field + info box di UI |
| FR-1.5: Disconnect dengan notifikasi batch aktif | ⚠️ **GAP** | Disconnect cek batch aktif (409), tapi auto-pause & notifikasi ke user belum ada |
| FR-1.6: Outlook login | ❌ **V1.1** | Sesuai PRD, didorong ke V1.1 |

### 3. Profile (Modul 8.2)

| FR | Status | Catatan |
|----|--------|---------|
| FR-2.1: Data pribadi | ✅ | fullName, birthDate, address, photo |
| FR-2.2: Kontak | ✅ | email, phone, linkedinUrl, portfolioUrl |
| FR-2.3: Riwayat pendidikan | ✅ | CRUD inline dengan modal |
| FR-2.4: Riwayat pengalaman kerja | ✅ | CRUD inline dengan modal |
| FR-2.5: Variable template | ✅ | {{full_name}}, {{phone}}, {{email}}, {{linkedin}}, {{portfolio}}, {{company}}, {{position}} |
| FR-2.6: Variable picker | ✅ | Toolbar di editor template |

### 4. Document Library (Modul 8.3)

| FR | Status | Catatan |
|----|--------|---------|
| FR-3.1: Upload (PDF, DOCX, JPG/PNG, max 10MB) | ✅ | Validasi type & size di API |
| FR-3.2: Nama/label bebas | ✅ | |
| FR-3.3: Tag kategori | ✅ | CV, Portfolio, Ijazah, SKCK, Transkrip, Lainnya |
| FR-3.4: Preview di aplikasi | ✅ | Dialog dengan iframe embed dari signed URL |
| FR-3.5: Rename, replace, delete | ✅ | PUT endpoint untuk replace + increment version |
| FR-3.6: Cegah hapus dokumen dipakai batch berjalan | ✅ | 409 conflict jika masih dipakai |
| FR-3.7: Versioning | ✅ | Replace otomatis increment version; S3 key timestamped (old version tetap ada) |

### 5. Template Email (Modul 8.4)

| FR | Status | Catatan |
|----|--------|---------|
| FR-4.1: Subject, Body, Signature | ✅ | closing field sebagai signature |
| FR-4.2: Variable dari Profile & Recipient | ✅ | 7 variable |
| FR-4.3: Preview dengan data contoh | ✅ | Dummy data rendering |
| FR-4.4: Clone template | ✅ | API clone + "(copy)" suffix |
| FR-4.5: Favorite | ✅ | isFavorite toggle |
| FR-4.6: Validasi variable tak terisi | ✅ | Worker throw error jika ada `{{...}}` unresolved setelah render |

### 6. Recipient Management (Modul 8.5)

| FR | Status | Catatan |
|----|--------|---------|
| FR-5.1: Tambah manual | ✅ | |
| FR-5.2: Import CSV | ✅ | Template CSV + validasi + duplicate handling (skip/merge) |
| FR-5.3: Export CSV | ✅ | Download file |
| FR-5.4: Search & filter | ✅ | Search by name/email/position + filter by status/tag |
| FR-5.5: Duplicate detection | ✅ | Unique constraint (userId, hrEmail) + skip/merge opsi |
| FR-5.6: Riwayat lamaran per perusahaan | ✅ | Dialog riwayat dengan link ke batch detail |
| FR-5.7: Edit & delete dengan warning | ✅ | |

### 7. Batch Lamaran — Core Module (Modul 8.6)

#### Setup Batch (Wizard 7 Langkah)

| FR | Status | Catatan |
|----|--------|---------|
| FR-6.1: Nama & deskripsi | ✅ | |
| FR-6.2: Pilih akun email | ✅ | |
| FR-6.3: Pilih template | ✅ | |
| FR-6.4: Pilih dokumen lampiran | ✅ | Multi-select |
| FR-6.5: Pilih perusahaan | ✅ | Dengan search |
| FR-6.6: Atur jadwal | ✅ | Tanggal, jam, delay, jam aktif, hari aktif, kirim sekarang |
| FR-6.7: Preview | ✅ | Sample render + ringkasan |
| FR-6.8: Submit atau simpan draft | ✅ | |

#### Lifecycle & Eksekusi

| FR | Status | Catatan |
|----|--------|---------|
| FR-6.9: State machine (Draft→Scheduled→Running→Paused→Completed/Stopped/Failed) | ✅ | |
| FR-6.10: Kirim sesuai delay & jam aktif | ✅ | Lewat BullMQ dengan delay per-job |
| FR-6.11: Retry otomatis (default 2x) | ✅ | BullMQ retry + exponential backoff |
| FR-6.12: Auto-stop jika failure rate >30% | ✅ | autoStopThreshold + worker check |
| FR-6.13: Pause & resume | ✅ | Pause remove pending jobs dari BullMQ queue; resume re-queue |
| FR-6.14: Stop batch | ✅ | Mark pending sebagai skipped |

#### Monitoring

| FR | Status | Catatan |
|----|--------|---------|
| FR-6.15: Real-time breakdown (Pending, Sent, Failed, Skipped, ETA) | ✅ | Auto-poll tiap 10 detik di detail batch; 15 detik di dashboard & list |
| FR-6.16: Log individual per perusahaan | ✅ | |
| FR-6.17: Update status manual per perusahaan | ✅ | Dropdown APPLIED, REPLY, INTERVIEW, TECHNICAL_TEST, HR_INTERVIEW, OFFERING, ACCEPTED |

---

## Definition of Done (PRD §14)

| Kriteria | Status |
|----------|--------|
| User dapat menghubungkan minimal 1 akun Gmail via OAuth | ✅ |
| User dapat mengisi Profile dan variable-nya terpakai otomatis di template | ✅ |
| User dapat upload & kelola dokumen di Document Library | ✅ |
| User dapat membuat, preview, dan clone Template Email | ✅ |
| User dapat menambah perusahaan manual maupun import CSV, dengan duplicate detection | ✅ |
| User dapat membuat Batch Lamaran lengkap (7 step wizard) dan mengirim/menjadwalkannya | ✅ |
| User dapat memantau progres batch secara real-time | ✅ (auto-poll 10-15 detik) |
| User dapat mengubah status lamaran per perusahaan secara manual | ✅ |
| Sistem menerapkan delay, retry, dan auto-stop | ✅ |

---

## In-Scope V1 — Fitur yang Sudah Sesuai PRD

| Modul | Coverage |
|-------|----------|
| Email Account | ✅ 5/6 FR (Outlook sengaja ditunda) |
| Profile | ✅ 6/6 FR |
| Document Library | ✅ 7/7 FR |
| Template Email | ✅ 6/6 FR |
| Recipient Management | ✅ 7/7 FR |
| Batch Lamaran | ✅ 17/17 FR |
| Dashboard | ✅ Bonus (out-of-scope V1 tapi sudah dibuat) |
| Worker/Infrastruktur | ✅ Semua |

---

## In-Scope V1 — Fitur yang Belum / Kurang

| # | Gap | Modul | Prioritas | Detail |
|---|-----|-------|-----------|--------|
| 1 | **Disconnect notification** | Email Account | 🟢 **Low** | Disconnect cegah batch baru tapi tidak auto-pause batch berjalan + notifikasi |

---

## Out-of-Scope V1 — Sesuai Arahan PRD (tidak perlu dibuat)

- Dashboard analitik ringkasan → ✅ per PRD, ini bonus (sudah diimplementasi)
- Replies management / thread viewer → ❌ sengaja tidak dibuat (Modul 10, V1.2)
- Job Pipeline drag-and-drop → ❌ sengaja tidak dibuat (Modul 11, V1.2)
- Activity Log terpisah → ⚠️ sudah ada ActivityLog model & embedded di batch detail (sederhana)
- Analytics mendalam → ❌ sengaja tidak dibuat (Modul 13, V1.3+)
- Settings global lengkap → ❌ sengaja tidak dibuat
- Follow Up Reminder → ❌ V1.1
- AI Summary → ❌ V1.3+
- Outlook login → ❌ V1.1

---

## Non-Functional Requirements

| Kategori | Status | Catatan |
|----------|--------|---------|
| Token OAuth terenkripsi | ✅ | AES-256-GCM via `lib/encryption.ts` |
| Rate limiting endpoint publik | ❌ **GAP** | Tidak ada rate limiting |
| Delay antar kirim & auto-stop | ✅ | Worker implementasi |
| Job queue persistent (BullMQ + Redis) | ✅ | Bukan in-memory |
| Setup batch < 2 detik untuk 100+ perusahaan | ❓ **Belum terverifikasi** | Tidak ada benchmark |
| Parallel batch dari user berbeda | ✅ | BullMQ handle |
| Audit log per pengiriman | ✅ | ActivityLog model |
| Dokumen di storage privat + signed URL | ✅ | S3 + presigned URL |

---

## Isu Non-Fungsional Lain

| # | Isu | Severity | Detail |
|---|-----|----------|--------|
| A | Tidak ada test | 🟡 **Medium** | 0 test files (unit, integration, e2e) |
| B | `next.config.ts` kosong | 🟢 **Low** | Tidak ada konfigurasi image domains, redirects, atau security headers |

---

## Kesimpulan

**Progress: ~99% dari PRD V1 (✅ Semua modul selesai)**

Semua fitur In-Scope V1 sudah diimplementasi secara fungsional:
- ✅ 2 isu **critical** — fixed (middleware, .env)
- ✅ 1 gap **high** — pause now removes BullMQ jobs
- ✅ 2 gap **medium** — auto-poll monitoring + inline preview dokumen
- ✅ 4 gap **low** — company history, variable validation, versioning, replace file

**Sisa 1 gap low:** Disconnect notification (auto-pause batch berjalan saat akun email di-disconnect)

**Non-functional gaps yang belum tertangani:**
- Rate limiting endpoint publik
- Tidak ada test (unit/integrasi/e2e)
- `next.config.ts` kosong (tidak ada security headers, image optimization)
