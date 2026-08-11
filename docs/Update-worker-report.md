# Laporan Implementasi — Sending-Focused Worker Refactor

**Referensi:** `docs/Update-worker.md`
**Branch:** `main` (belum di-commit / di-PR)
**Tanggal:** 2026-08-11

## Ringkasan

Refactor worker berfokus pada pipeline pengiriman email (Phase A + B + C dari dokumen). Semua item dikerjakan; non-core worker sekarang nonaktif secara default, pipeline kirim menggunakan `addBulk` dengan job ID deterministik, retry berbasis klasifikasi error, active window, per-account gate, auto-stop, perbaikan pause/resume/stop, MIME CRLF, dan persistensi token OAuth yang di-await.

## File yang Diubah (6 + .env.example)

| File | Perubahan |
|---|---|
| `workers/index.ts` | Worker Email selalu jalan; Reply, Resend Trigger, Resend Execution, Notification Batcher start hanya jika flag aktif. Cleanup scheduler (`removeJobScheduler`) saat flag mati (idempotent, try/catch). Routing outcome baru dari `processEmailSend` (completed / retry / failed / delayed). Delayed memakai `job.moveToDelayed()` + `throw new DelayedError()` (pola resmi BullMQ — moveToCompleted tidak akan salah menandai job). |
| `workers/email-worker.ts` | Rewrite besar: guard status menerima `PENDING` + `RETRY`; guard active-window (delay, bukan gagal); per-account gate Redis; retry/klasifikasi error per B2/B12; persistensi token OAuth di-await (B13); pakai `lib/attachments.ts`; panggil `updateBatchProgress` setelah setiap state terminal. |
| `lib/queue.ts` | `numEnv(name, default, {min,max})` baru (fix bug `Number(x) ?? y`), menggantikan semua parsing env di file ini. `BULL_CONCURRENCY` default **1**. Tipe `processor` diganti `any` → `Job` (lint bersih). |
| `lib/email-errors.ts` | Kategori baru `auth` dan `attachment` + `isRetryable(category)` (temporary/unknown = retryable). Pola auth/invalid_grant/attachment size ditambahkan. |
| `app/api/batches/start/route.ts` | Satu `emailQueue.addBulk()`, `opts.jobId = "send:<batchRecipientId>"`, `attempts = retryMax + 1`, delay kumulatif tetap, wrapper `withTimeout` 10s dihapus. Status `RUNNING` juga boleh di-start ulang (idempoten, no-op via jobId deterministik). |
| `app/api/batches/resume/route.ts` | Re-query dengan `batchDocuments` (fix lampiran hilang) + `userId` (fix `activityLog.create` rusak), rebuild data job lengkap via `addBulk` dengan jobId deterministik dan spacing `delaySeconds`. Menerima PENDING + RETRY. Jika tidak ada recipient tersisa → `COMPLETED` (menghilangkan dead-end "RUNNING tanpa job"). |
| `app/api/batches/pause/route.ts` | Hapus job via ID asli `emailQueue.remove("send:<brId>")` untuk PENDING + RETRY (perbaikan dari `send-<id>` yang tidak pernah cocok). |
| `app/api/batches/stop/route.ts` | PENDING/RETRY → `SKIPPED` **dan** job-nya dihapus dari Redis oleh ID. |
| `.env.example` | `BULL_CONCURRENCY=1`, flag worker baru (default false) didokumentasikan. |

## File Baru (5)

| File | Isi |
|---|---|
| `lib/worker-flags.ts` | `boolEnv(name, default=false)` + `ENABLE_REPLY_WORKER`, `ENABLE_RESEND_WORKERS`, `ENABLE_NOTIFICATION_BATCHER` (semua default `false`). |
| `lib/active-window.ts` | `parseTimeMinutes`, `parseActiveDays` (dukung format `"MON,TUE"` dan `"1,2,3,4,5"`), `isWithinWindow(now, batch)`, `nextWindowStart(now, batch)`. Null field = selalu boleh. Mendukung window melewati tengah malam (start > end). |
| `lib/batch-progress.ts` | `updateBatchProgress(batchId)`: satu `groupBy` status per panggilan; **COMPLETED** bila tanpa PENDING/RETRY dan batch RUNNING (+1 activityLog); **Auto-Stop**: `FAILED/(SENT+FAILED) > autoStopThreshold` (fraksi), gerbang minimal **10** recipient diproses, batch → STOPPED (guarded re-read via `updateMany`), sisa → SKIPPED + job dihapus + 1 activityLog. `computeAutoStopRatio` di-export untuk unit test. |
| `lib/attachments.ts` | `loadAttachmentFiles` (satu `findMany`, cache per storage key TTL ~10 menit, total-bytes cap 128MB dengan eviction LRU, `!res.ok` → `AttachmentError`), `encodeMimeWord` (helper tunggal), `buildMimeMessage` (MIME `\r\n` RFC 5322), `assertMessageWithinLimit` (batas Gmail 25MB, error permanen jelas). |
| `tests/worker-logic.test.ts` | 32 unit test murni (jalan via `npx tsx tests/worker-logic.test.ts`, tanpa framework tambahan). |

## Alur Routing Error Worker (B2 + B12)

| Kategori | Aksi |
|---|---|
| `permanent`, `attachment`, `auth` | Recipient → `FAILED` + errorLog + activityLog, **return tanpa throw** (tanpa buang attempt) |
| `quota` / rate-limit | `moveToDelayed(now + 30 menit)`, **tanpa attempt terpakai** (`skipAttempt` bawaan BullMQ) |
| `temporary`, `unknown` | Attempt tersisa → status `RETRY`, `retryCount+1`, errorLog, **throw** (BullMQ retry exponential). Attempt terakhir → `FAILED` + errorLog, throw (BullMQ tandai failed; tidak ada enqueue manual) |
| Sukses | `SENT` + sentAt + thread/message id + `last-sent` key + activityLog + `updateBatchProgress` |

## Per-Account Gate (B5/B6)

- `send-lock:<emailAccountId>`: `SET NX PX` TTL = `delaySeconds` (race-safe antar job/instance).
- `last-sent:<emailAccountId>`: ditulis **hanya setelah** send sukses.
- Lock gagal / jeda antar-kirim < `delaySeconds` → `moveToDelayed` ke sisa waktu tunggu; tidak ada pengiriman paralel per akun. `BULL_CONCURRENCY` default 1 sebagai lapisan kedua.

## Catatan Implementasi / Keputusan

1. **`moveToDelayed` + `DelayedError`**: pada BullMQ 5.81.2, return biasa setelah `moveToDelayed` menyebabkan `moveToCompleted` error -3 (job sudah tidak di active list). Karena itu processor melempar `DelayedError` setelah `moveToDelayed` — pola yang didukung BullMQ, job tetap di delayed tanpa event error.
2. **`Queue.remove`** di BullMQ 5.81.2 hanya menerima satu `jobId` (string), jadi penghapusan massal memakai `Promise.all(...)`.
3. **Persistensi OAuth (B13)**: handler `tokens` kini hanya menyimpan token hasil refresh (`{...tokens, ...newTokens}` — termasuk `access_token` + `expiry_date`), lalu `prisma.emailAccount.update` **di-await** setelah send, hanya jika token benar-benar berubah. `refresh_token` tidak lagi menjadi syarat.
4. **Auto-Stop**: perbandingan `>` (strict); di persis ambang (0.3) tidak trip. Gerbang sampel minimum 10 recipient.
5. **Resume kosong**: jika setelah pause tidak ada recipient PENDING/RETRY, resume menandai batch `COMPLETED` (mencegah batch tersangkut `RUNNING` selamanya).
6. **`npx prisma validate`** butuh `DATABASE_URL`; dijalankan dengan env dummy — schema valid. Schema tidak disentuh (sesuai spec, tidak ada migrasi).

## Verifikasi (semua lolos)

| Check | Hasil |
|---|---|
| `npx tsc --noEmit` | ✅ 0 error |
| `npm run lint` | ✅ 60 problems (39 err, 21 warn) vs baseline HEAD **66 problems (43 err, 23 warn)** — semua sisa adalah pre-existing di file yang tidak disentuh (frontend, dll); semua file yang diubah/baru bersih. |
| `npm run build` (`NODE_OPTIONS=--max-old-space-size=6144`) | ✅ Compiled + TypeScript + 50/50 halaman. (Tanpa flag heap, `next build` OOM — keterbatasan environment, bukan kode.) |
| `npx prisma validate` | ✅ schema valid (dengan dummy `DATABASE_URL`) |
| `npx tsx tests/worker-logic.test.ts` | ✅ **32/32** lolos (active-window: dalam/luar window, rollover weekend, null fields, dua format activeDays, window overnight; numEnv: unset/NaN/out-of-range; auto-stop: rasio + gerbang sampel) |

## Catatan Tambahan

- `graphify update .` tidak dapat dijalankan: CLI `graphify` tidak ter-install di environment ini.
- Belum ada integrasi test Gmail/Redis sungguhan (sesuai spec dokumen, tidak diklaim lolos tanpa dijalankan). Checklist staging manual dari dokumen tetap berlaku untuk PR description.
- Risiko & deployment (dari dokumen) berlaku: reply detection/auto-resend nonaktif sampai flag dinyalakan; deploy sebaiknya saat tidak ada batch berjalan (job lama ber-ID auto-increment tidak cocok dengan penghapusan baru); verifikasi CRLF MIME ke Gmail/Outlook sebelum merge.
