# Review — Personalized Application Letter Implementation

Tanggal: 2026-08-12
Scope: review produksi implementasi integrasi Gotenberg DOCX → PDF pada email worker (task: `docs/Task-implement.md`).

Metode: inspeksi kode aktual (bukan laporan sebelumnya). Belum ada perubahan kode yang dilakukan saat review ini.

## Ringkasan

- **18 PASS**
- **0 FAIL**
- **1 NEEDS FIX**

## Verdict per item

| # | Item | Verdict | Bukti (file:line) |
|---|------|---------|-------------------|
| 1 | Deteksi SURAT_LAMARAN DOCX | PASS | `lib/letter.ts:19-27` (`category === "SURAT_LAMARAN"` + ekstensi `.docx` pada `fileUrl`/`name`, case-insensitive di `lib/letter.ts:15-17`); dipakai di `workers/email-worker.ts:221-223` |
| 2 | Pemilihan template saat batch punya banyak dokumen | **NEEDS FIX** | `findLetterTemplate` memakai `Array.prototype.find` (`lib/letter.ts:23`) → mengambil match pertama sesuai urutan hasil `findMany` (`lib/attachments.ts:121-123`, tanpa `orderBy`). Kategori SURAT_LAMARAN mengizinkan 2 dokumen, sehingga pemilihan tidak deterministik antar-run |
| 3 | `{{company}}` / `{{position}}` / `{{date}}` diganti benar | PASS | `lib/document-template.ts:62-84`; nilai dari `recipient.companyName`, `recipient.position ?? ""`, `formatLetterDate(batch.scheduledAt ?? now)` di `workers/email-worker.ts:227-233`; 30 test lulus |
| 4 | Placeholder terbelah antar-run DOCX | PASS | docxtemplater menggabungkan run per paragraf; test "placeholder split across multiple runs is replaced" lulus |
| 5 | Buffer DOCX asli tidak pernah termutasi | PASS | `renderDocxTemplate` menyalin ke PizZip, render in-memory, `generate()` menghasilkan buffer baru (`lib/document-template.ts:54,78,86`); test byte-identity lulus |
| 6 | Gotenberg memakai `process.env.GOTENBERG_URL` | PASS | `lib/gotenberg.ts:15-23`, gagal jelas jika tidak dikonfigurasi; ter-cermin di `lib/env.ts` |
| 7 | Endpoint tepat `/forms/libreoffice/convert` | PASS | Konstanta `GOTENBERG_CONVERT_PATH` di `lib/gotenberg.ts:1`, dipakai di baris 69 |
| 8 | Kegagalan Gotenberg masuk ke retry/klasifikasi error worker | PASS | Kategori `temporary`/`permanent` dibaca `describeFailure` (`workers/email-worker.ts:70-85`); temporary → `markRetry` + throw (backoff BullMQ), permanent → `markFailed` — jalur yang sama dengan `AttachmentError` |
| 9 | Konversi gagal tidak bisa menghasilkan SENT | PASS | Render+konversi (`workers/email-worker.ts:221-238`) terjadi sebelum `gmail.send` (baris 252) dan update `SENT` (baris ~266); output non-PDF di-throw (`lib/letter.ts:84-89`) |
| 10 | Buffer PDF dilepas setelah kirim | PASS | PDF hanya ada di scope lokal `attachments`, tidak dirujuk lagi setelah `processEmailSend` selesai; tidak pernah masuk `fileCache` (hanya dokumen sumber, `lib/attachments.ts:137-147`); dibersihkan GC |
| 11 | Lampiran CV/PDF lama tidak tersentuh | PASS | `workers/email-worker.ts:234-237` hanya mengganti file dengan `documentId === letterTemplate.id`; lampiran lain lolos byte-identical |
| 12 | Limit 25 MB Gmail tetap ditegakkan | PASS | `assertMessageWithinLimit(raw)` pada MIME lengkap termasuk PDF hasil generate (`workers/email-worker.ts:250`) |
| 13 | Tidak ada duplikasi query database | PASS | `loadAttachmentsWithMeta` = satu `document.findMany` (`lib/attachments.ts:121-123`), sama seperti sebelumnya; nol query baru |
| 14 | PDF antar-recipient tidak tertukar | PASS | Render per job dengan nilai recipient-nya (`workers/email-worker.ts:227-233`); tidak ada state bersama; test "company-specific pdf differs per recipient" lulus |
| 15 | Template di-fetch/di-render sekali per recipient | PASS | Cache setelah fetch pertama (`lib/attachments.ts:127-131`), dipakai ulang lewat `docxBuffer` (`workers/email-worker.ts:232`); tepat 1 render + 1 konversi per job |
| 16 | PDF tidak dipersist ke Supabase/Redis | PASS | Tidak ada `uploadFile`/`redis.set` di jalur surat lamaran; PDF hanya di memori |
| 17 | Kompatibel dengan BullMQ concurrency = 1 | PASS | Satu konversi di-await (`workers/email-worker.ts:227`), tidak ada `Promise.all` di jalur kirim; concurrency tetap `numEnv("BULL_CONCURRENCY", 1)` (`lib/queue.ts:111`) |
| 18 | Pause/resume/stop tetap kompatibel | PASS | Route tidak disentuh; resume/start membangun ulang data job identik termasuk `documentIds` (`app/api/batches/resume/route.ts:17,30,40`); logika surat hanya berjalan di dalam worker |
| 19 | Auto-Stop tetap kompatibel | PASS | `updateBatchProgress`/`computeAutoStopRatio` tidak disentuh; kegagalan surat masuk ke rasio FAILED yang sama |

## Satu-satunya masalah: item 2 (NEEDS FIX)

Pemilihan template tidak deterministik jika satu batch berisi lebih dari satu SURAT_LAMARAN `.docx` (kategori mengizinkan maksimal 2 dokumen).

Opsi perbaikan minimal:

- **A (disarankan)**: tambahkan `orderBy: { createdAt: "asc" }` pada `findMany` di `loadAttachmentsWithMeta` (`lib/attachments.ts:121-123`) → template terlama menang, pemilihan stabil.
- **B**: urutkan di dalam `findLetterTemplate` sebelum `.find()` (`lib/letter.ts:23`).

Catatan: ini hanya masalah determinisme (batch yang sama selalu memakai template yang sama), bukan risiko tertukarnya PDF antar-recipient.
