# Laporan Audit Worker - Pake Mail

Laporan audit komprehensif ini menganalisis sistem background job processing (worker) pada aplikasi **Pake Mail** berbasis Next.js, PostgreSQL (Prisma), Redis (BullMQ), dan Gmail API.

---

## 1. Arsitektur Umum & Konfigurasi Antrean (Queue)

Sistem background processing Pake Mail menggunakan **BullMQ** sebagai pustaka antrean berbasis Redis. BullMQ diatur secara lazy (tidak langsung terinisiasi pada saat build time melainkan di runtime sesuai kebutuhan) untuk menghindari masalah ketiadaan `REDIS_URL` selama proses kompilasi Next.js/Vercel build.

### 1.1 Konfigurasi Lazy Queue (`lib/queue.ts`)
Fungsi `lazyQueue` menggunakan ES6 Proxy untuk membungkus instans `Queue`.
- **Mekanisme:** Proxy mengalihkan akses properti/metode ke instans `Queue` asli yang disimpan di `globalThis`. Instansi sesungguhnya baru dibuat (`new Queue(...)`) saat properti pertama kali diakses.
- **Daftar Antrean & Opsi Bawaan (`baseOptions`):**
  - **Email Batch Queue (`__emailQueue`):** Menggunakan nama antrean dari `process.env.BULL_QUEUE_NAME` atau default `email-batch-queue`.
  - **Reply Poll Queue (`__replyQueue`):** Default `reply-poll-queue`.
  - **Resend Trigger Queue (`__resendTriggerQueue`):** Default `resend-trigger-queue`.
  - **Resend Execution Queue (`__resendExecutionQueue`):** Default `resend-execution-queue`.
  - **Notification Batch Queue (`notification-batch-queue`):** Diinisiasi langsung di level worker (bukan lazy).

Opsi penanganan kegagalan/retry bawaan (`baseOptions`):
- `attempts`: Diambil dari `BULL_MAX_RETRIES` (default `3`).
- `backoff`: Strategi eksponensial dengan delay awal dari `BULL_DEFAULT_RETRY_DELAY` (default `60000ms` / 1 menit).
- `removeOnComplete`: Menyimpan maksimal `100` riwayat sukses terbaru.
- `removeOnFail`: Menyimpan maksimal `50` riwayat gagal terbaru.

---

## 2. Analisis Mendalam Masing-masing Worker

Aplikasi ini menjalankan 5 jenis worker utama yang dikoordinasikan melalui entrypoint `workers/index.ts`.

### 2.1 Email Worker (`workers/email-worker.ts`)
Bertanggung jawab memproses pengiriman email dari daftar penerima (recipient) pada suatu batch kampanye email.

- **Konfigurasi Concurrency:** Diatur secara dinamis melalui `process.env.BULL_CONCURRENCY` (default `5`).
- **Alur Kerja (Workflow):**
  1. Menerima payload pekerjaan (`SendJobData`) yang berisi ID terkait (Batch, Recipient, Email Account, Template, dll).
  2. Memeriksa status `Batch`:
     - Jika status batch adalah `STOPPED` atau `FAILED`, status penerima diubah menjadi `SKIPPED` dan pemrosesan dihentikan.
     - Jika status batch adalah `PAUSED`, pemrosesan dibatalkan sementara tanpa mengubah status penerima.
     - Jika status batch masih `SCHEDULED`, status diperbarui menjadi `RUNNING`.
  3. Memvalidasi bahwa status penerima saat ini adalah `PENDING`. Jika bukan, dilewati.
  4. Mendekripsi kredensial OAuth dari model `EmailAccount`. Jika Google memperbarui token aksesnya, event `tokens` akan menangkap `refresh_token` baru, mengenkripsinya kembali dengan AES-256-GCM, lalu menyimpannya ke database.
  5. Melakukan render variabel dinamis template email (seperti `{{full_name}}`, `{{company}}`, `{{position}}`, dll.) menggunakan data dari Profil pengguna dan Recipient.
  6. Mengambil dokumen lampiran dari Object Storage (Cloudflare R2) dengan menghasilkan Signed URL berdurasi terbatas (`getSignedFileUrl`).
  7. Menyusun email ke dalam format MIME multi-part (dengan boundary string) dan mengodekannya ke dalam format Base64url.
  8. Mengirim pesan via Google Gmail API (`gmail.users.messages.send`).
  9. **Pembaruan Status & Riwayat:**
     - Jika sukses, status penerima diubah ke `SENT`, mencatat `sentAt`, `gmailThreadId`, dan `gmailMessageId`. Membuat catatan di `ActivityLog` (`EMAIL_SENT`).
     - Jika gagal, kesalahan dikategorikan menggunakan `categorizeError` untuk memberikan pesan log yang human-friendly di basis data, status diubah menjadi `FAILED`, dan memicu log aktivitas `EMAIL_FAILED`.

### 2.2 Reply Poll Worker (`workers/reply-worker.ts`)
Mengatur sinkronisasi berkala untuk mendeteksi balasan email dari HRD/penerima lamaran kerja.

- **Interval Eksekusi:** Menjalankan polling terjadwal secara periodik berdasarkan variabel lingkungan `REPLY_POLL_INTERVAL_MS` (default `5` menit).
- **Mekanisme Deteksi Bertingkat (`lib/gmail-poll.ts`):**
  Deteksi balasan dikategorikan ke dalam 4 tingkatan kepercayaan (Confidence Tier) untuk meminimalkan salah deteksi:
  1. **TIER 1: CONFIRMED (Thread Matching):**
     - Memeriksa pesan di dalam Thread Gmail asli (`gmailThreadId`).
     - Jika terdapat pesan baru yang dikirim oleh HR setelah pesan lamaran dikirim pengguna, ia dicatat sebagai balasan valid (`CONFIRMED`).
  2. **TIER 2: LIKELY (Sender Exact Match):**
     - Mencari pesan masuk dari alamat email HR yang sama dalam 90 hari terakhir.
     - Melakukan pencocokan exact match pada email pengirim.
  3. **TIER 3: POSSIBLE (Domain Match):**
     - Mencari pesan dari domain email yang sama dengan HR (misalnya `@perusahaan.com`) untuk melacak jika ada staf HR lain yang membalas.
  4. **TIER 4: INDIKASI (Company Name Match):**
     - Melakukan pencarian kata kunci berbasis nama perusahaan di kotak masuk Gmail (setelah mengabaikan sufiks hukum umum seperti PT, CV, LLC, dll.).
- **Deteksi Email Otomatis (Auto-Reply / Bounce):**
  Menggunakan pola ekspresi reguler (`AUTO_REPLY_PATTERNS` dan `AUTO_REPLY_SENDERS`) untuk mendeteksi apakah email balasan tersebut dikirim secara otomatis (misalnya dari sistem ATS, "out of office", atau "mailer-daemon"). Status `isLikelyAutomated` akan diset `true` jika cocok.
- **Efek Samping Deteksi Balasan:**
  - Jika tingkat keyakinan memenuhi syarat perubahan status, status `BatchRecipient` diubah menjadi `REPLY`.
  - Secara otomatis membatalkan seluruh jadwal auto-resend yang tertunda (`PENDING_APPROVAL`) pada penerima tersebut dengan mengubah statusnya ke `CANCELLED`, serta menghapus `nextResendScheduledAt` agar email follow-up tidak terkirim.
  - Membuat `ActivityLog` dan mengirimkan `Notification` sistem lokal.

### 2.3 Notification Batcher (`workers/notification-batcher.ts`)
Membatasi banjir notifikasi instan dengan mengumpulkan notifikasi baru pengguna dan mengirimkannya dalam bentuk ringkasan berkala.

- **Interval Eksekusi:** Berjalan secara berkala setiap 1 jam sekali (`BATCH_INTERVAL_MS = 3600000ms`).
- **Workflow:**
  1. Mengumpulkan semua entri `Notification` yang dibuat dalam 1 jam terakhir.
  2. Mengelompokkan notifikasi berdasarkan `userId`.
  3. Menyusun ringkasan teks terstruktur yang merangkum jumlah balasan baru (`new_reply`) dan status perkembangan batch terbaru.
  4. Menampilkan ringkasan ringkas ke konsol log (atau dalam implementasi produksi dikirimkan via email).

### 2.4 Auto-Resend Trigger Worker (`workers/resend-trigger-worker.ts`)
Memindai status kampanye email aktif untuk mendeteksi penerima yang tidak memberikan balasan dalam batas waktu tertentu, kemudian menyiapkan surat tindak lanjut (follow-up/resend) otomatis.

- **Interval Eksekusi:** Dijalankan secara otomatis setiap 30 menit sekali.
- **Workflow:**
  1. Mengambil seluruh batch berstatus `COMPLETED`, `RUNNING`, atau `SCHEDULED`.
  2. Mengevaluasi pengaturan resend efektif untuk pengguna dan batch tersebut (`getEffectiveSettings`). Jika fitur dinonaktifkan, proses dilewati.
  3. Memilih penerima (`BatchRecipient`) yang berada dalam status `SENT` atau `APPLIED`, di mana waktu pengiriman sudah melewati ambang batas (`resendThresholdDays`), dan jumlah follow-up yang terkirim saat ini belum melampaui jumlah maksimal (`resendMaxCount`).
  4. Jika kriteria terpenuhi, sistem menjadwalkan pengiriman tindak lanjut dengan membuat entri `ResendSchedule` dengan status `PENDING_APPROVAL`.
  5. Waktu pengiriman ditetapkan sejauh `approvalWindowHours` ke depan (default `24 jam`), memberikan waktu bagi pengguna untuk memverifikasi atau membatalkannya secara manual.
  6. Mengirimkan notifikasi lokal bertipe `resend_pending`.

### 2.5 Auto-Resend Execution Worker (`workers/resend-execution-worker.ts`)
Mengeksekusi pengiriman email tindak lanjut (resend) yang telah melewati waktu tunggu persetujuan (`scheduledSendAt <= Date.now()`).

- **Interval Eksekusi:** Berjalan rutin setiap 5 menit sekali.
- **Workflow:**
  1. Mencari jadwal `ResendSchedule` berstatus `PENDING_APPROVAL` yang waktu eksekusinya telah tiba atau terlewati.
  2. Memvalidasi kembali status penerima dan status batch saat ini:
     - Jika status penerima sudah bukan `SENT` atau `APPLIED` (misal sudah berubah ke `REPLY`), jadwal otomatis di-`CANCELLED`.
     - Jika status batch telah berubah ke `STOPPED` atau `FAILED`, jadwal juga dibatalkan.
     - Jika counter pengiriman melebihi `resendMaxCount`, jadwal dibatalkan.
  3. Mendekripsi token Google OAuth, merender ulang template email asli, memuat lampiran dokumen asli.
  4. Mengirimkan email tindak lanjut menggunakan Gmail API.
  5. **Pembaruan Status:**
     - Menaikkan nilai `resendCount` pada penerima lamaran.
     - Mencatat `lastResendAt` dan mengosongkan `nextResendScheduledAt`.
     - Memperbarui status jadwal `ResendSchedule` menjadi `SENT`.
     - Menyimpan catatan log aktivitas `RESEND_SENT`.
     - Jika pengiriman gagal, status jadwal diubah menjadi `CANCELLED` dan mencatat `RESEND_FAILED` pada log aktivitas.

---

## 3. Transisi Status Database & Efek Samping (Side Effects)

Sistem worker ini sangat bergantung pada konsistensi status data di PostgreSQL untuk mencegah masalah pengiriman ganda atau kegagalan penanganan balasan.

```
       +------------------ PENDING -------------------+
       |                                              |
       v (Email Worker)                               v (Email Worker Fail)
     SENT / APPLIED                                 FAILED
       |
       +-----------------+-------------------+
       v (Gmail Poll)    v (Trigger Resend)  v (Gmail Poll Confirmed/Likely)
     REPLY (Status)     ResendSchedule     CANCELLED (Pending Resend)
                        (PENDING_APPROVAL)
                                 |
                                 v (Execution Worker)
                        SENT (ResendSchedule) -> resendCount++
```

### 3.1 Integrasi Antar-Worker yang Unik
- **Saling Pembatalan:** Apabila `Reply Poll Worker` menemukan balasan email yang sah dari HRD, ia tidak hanya memperbarui status penerima menjadi `REPLY`, tetapi langsung mengeksekusi kueri pembatalan `ResendSchedule` yang berstatus `PENDING_APPROVAL`. Ini adalah jaring pengaman kritis agar email follow-up tidak terkirim secara tidak sopan kepada HRD yang sudah memberikan tanggapan.

---

## 4. Keamanan & Proteksi Data

Aplikasi ini mengimplementasikan langkah-masing keamanan yang ketat pada worker:
1. **Enkripsi Kredensial (At-Rest Encryption):**
   Token OAuth Gmail (`oauthToken`) disimpan dalam bentuk terenkripsi menggunakan algoritma enkripsi simetris (AES-256-GCM) melalui modul `lib/encryption.ts` dengan kunci `OAUTH_TOKEN_ENCRYPTION_KEY` (64 karakter hex). Dekripsi hanya dilakukan secara instan di memori worker saat akan memanggil Gmail API.
2. **Pembaruan Otomatis Token Google OAuth (Token Rotation):**
   Sistem worker mendengarkan event `"tokens"` pada pustaka `googleapis` OAuth2 client. Ketika mendeteksi Google mengembalikan pasangan token akses yang baru, worker langsung mengenkripsi ulang dan menyimpan token terbaru tersebut ke PostgreSQL secara transparan tanpa menginterupsi antrean pekerjaan.
3. **Signed URLs untuk Lampiran Dokumen:**
   Dokumen lamaran kerja (seperti CV, Portofolio, Ijazah) tidak disimpan di folder publik yang dapat diakses sembarang orang. Dokumen disimpan dengan aman di Cloudflare R2 / S3. Worker menghasilkan Signed URL bertenggat waktu singkat via `getSignedFileUrl` untuk mengunduh berkas lampiran secara aman sebelum dikirimkan.
4. **Exclude List Pattern (`lib/gmail-poll.ts`):**
   Selama proses pencarian balasan tingkat *Indikasi*, filter regex diaplikasikan untuk menghindari pencocokan dari alamat atau subjek email tertentu yang telah dimasukkan oleh pengguna ke daftar pengecualian (`ExcludeListEntry`), guna mencegah interferensi kebocoran data sensitif.

---

## 5. Ringkasan Evaluasi & Peluang Rekayasa / Perbaikan

Setelah melakukan audit menyeluruh terhadap kode program, berikut adalah poin evaluasi penting:

| Area Evaluasi | Status | Detail & Rekomendasi |
|---|---|---|
| **Pencegahan Kematian Aplikasi (Error Handling)** | 🟢 Sangat Baik | Setiap worker dibungkus dengan blok `try-catch` yang kokoh, sehingga kegagalan satu pekerjaan tidak akan menghentikan seluruh proses worker utama. |
| **Konektivitas Redis** | 🟢 Baik | Pola lazy-loading pada `lib/queue.ts` sangat cerdas dalam mencegah error `REDIS_URL` tak terdefinisi saat deployment/build di platform serverless seperti Vercel. |
| **Batas Pengiriman Gmail API** | 🟡 Cukup | Saat ini aplikasi belum mengaudit batas kuota harian Gmail (biasanya 2000 email/hari untuk Google Workspace, 500 email/hari untuk akun gratis). Direkomendasikan menambahkan pengecekan limit pada `EmailAccount.dailyLimit` sebelum mendorong pekerjaan ke antrean. |
| **Penanganan Duplikasi Pekerjaan** | 🟢 Sangat Baik | Adanya validasi ketat status `PENDING` di awal eksekusi `email-worker.ts` mencegah eksekusi ganda jika pekerjaan BullMQ di-retry atau dikirim ulang. |
| **Skalabilitas Pemrosesan Balasan** | 🟡 Cukup | `pollAllUsers` memproses semua akun secara berurutan dalam satu perulangan. Jika jumlah pengguna meningkat sangat banyak, disarankan menggunakan `Promise.all` dengan pembatasan limit concurrency (misal menggunakan library `p-limit`) agar tidak memblokir antrean. |

---
*Dokumen ini dibuat secara otomatis sebagai hasil audit komprehensif sistem Worker.*
