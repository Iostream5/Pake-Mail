# Product Requirements Document (PRD)
## Pake Mail (PM) — V2

**Versi Dokumen:** 2.0
**Status:** Draft untuk Review
**Prasyarat:** V1 sudah diimplementasikan penuh (Email Account, Profile, Document Library, Template Email, Recipient Management, Batch Lamaran)

---

## 1. Ringkasan Eksekutif

V1 menyelesaikan masalah inti: mengirim lamaran ke banyak perusahaan tanpa copy-paste manual. Tapi satu bagian penting dari siklus melamar kerja masih manual sepenuhnya di V1 — **mengetahui dan mencatat balasan**. User masih harus buka Gmail sendiri, baca balasan, lalu kembali ke Pake Mail untuk update status.

V2 berfokus menutup celah ini, sekaligus menambahkan visibilitas (Dashboard, Reply Rate) dan mengurangi human error di sisi pengiriman (Smart Attachment, peringatan re-apply). Semua fitur V2 sengaja dipilih karena saling terhubung ke satu alur yang sama — bukan penambahan fitur berdiri sendiri.

```
Replies Module (data balasan akurat & otomatis)
        │
        ▼
Dashboard + Reply Rate per Template (menampilkan data itu)
        │
        ▼
Notifikasi (mengingatkan user saat ada perubahan)

Smart Attachment + Peringatan Re-apply + Bounce Visibility
        │
        └── mengurangi human error di sisi pengiriman (independen dari alur di atas)
```

---

## 2. Tujuan & Success Metrics V2

| Tujuan | Metrik |
|---|---|
| Hilangkan kebutuhan cek Gmail manual buat tau status lamaran | % status lamaran yang ter-update otomatis vs manual (target >80% dari status "Reply" terisi otomatis) |
| Beri visibilitas instan atas performa melamar | User membuka Dashboard sebagai halaman pertama (bukan langsung ke Batch) |
| Kurangi kesalahan lampiran & pengiriman berulang ke perusahaan sama | Insiden salah lampiran & re-apply tanpa sadar mendekati 0% |
| Kurangi kebutuhan user mengecek aplikasi terus-menerus | User merespons notifikasi dalam <24 jam sejak diterima (proxy: engagement setelah notifikasi) |

---

## 3. Ruang Lingkup V2

### 3.1 In-Scope
1. Replies Module
2. Dashboard Ringkasan
3. Smart Attachment
4. Bounce/Error Visibility (pesan error yang manusiawi)
5. Reply Rate per Template
6. Peringatan Re-apply
7. Notifikasi Sederhana

### 3.2 Eksplisit Out-of-Scope V2
- **Login Outlook** — ditahan sampai ada sinyal kebutuhan nyata dari user (lihat §9 Catatan Keputusan)
- **Optimasi Modul Batch** (preset, duplicate batch, smart defaults delay/jadwal) — dipertimbangkan tapi diputuskan tidak dikerjakan di V2
- **Job Pipeline drag-and-drop penuh** — menunggu Replies Module stabil dulu supaya manfaatnya maksimal, bukan sekadar ganti cara klik
- **Analytics mendalam** — Reply Rate per Template di V2 adalah versi ringan yang cukup untuk saat ini
- **AI Summary balasan** — tetap di roadmap jangka panjang

---

## 4. Functional Requirements per Fitur

### 4.1 Replies Module

**Tujuan:** Mengambil balasan email secara otomatis dan memperbarui status lamaran tanpa user harus buka Gmail — termasuk kasus balasan yang tidak dikirim lewat tombol Reply (thread terpisah).

**Latar belakang keputusan:** Deteksi berbasis thread saja (reply asli) tidak menangkap kasus HRD yang membalas lewat email baru (subject berbeda, tanpa header threading), atau dari alamat lain di perusahaan yang sama. Karena itu, deteksi dirancang berlapis dengan **4 tingkat keyakinan (confidence tier)**, bukan biner terdeteksi/tidak.

**Requirements — Deteksi Berlapis:**
- FR2-1.1: Sistem melakukan polling/webhook ke Gmail API (scope `gmail.readonly` yang sudah didapat sejak V1) untuk mendeteksi balasan baru, menggunakan 4 metode berikut secara berurutan prioritas:

| Tier | Metode | Kriteria | Auto-update status `BatchRecipient` |
|---|---|---|---|
| **Confirmed** | Thread matching | Email baru masuk pada thread Gmail yang sama dengan email lamaran (`In-Reply-To`/`References` header) | Ya, otomatis ke `Reply` |
| **Likely** | Sender exact match | Alamat pengirim persis sama dengan `hrEmail` yang tersimpan di Recipient, walau di luar thread | Ya, otomatis ke `Reply` |
| **Possible** | Domain match | Domain email pengirim sama dengan domain `hrEmail`/`website` yang tersimpan, tapi alamat persisnya berbeda (orang lain di perusahaan yang sama) | Tidak — masuk daftar "Perlu Ditinjau" |
| **Indikasi** | Company name match | Nama perusahaan (`company_name`) disebut di display name pengirim atau body email, **DAN** diterima dalam rentang waktu wajar sejak lamaran dikirim (kandidat: maksimal 90 hari), **DAN** pengirim tidak cocok dengan exclude list (`noreply@`, `no-reply@`, domain media/berita umum, dsb) | Tidak — masuk daftar "Perlu Ditinjau", ditandai sebagai sinyal paling lemah |

- FR2-1.2: Hanya tier **Confirmed** dan **Likely** yang mengubah status `BatchRecipient` secara otomatis menjadi `Reply`. Tier **Possible** dan **Indikasi** tidak mengubah status otomatis — masuk ke daftar tinjauan manual agar tidak ada perubahan status yang salah tanpa sepengetahuan user.
- FR2-1.3: Halaman Replies terpusat dibagi menjadi dua bagian: **"Balasan"** (hasil tier Confirmed + Likely) dan **"Perlu Ditinjau"** (hasil tier Possible + Indikasi), masing-masing menampilkan subject, cuplikan singkat, waktu, nama perusahaan terkait, dan badge tier-nya.
- FR2-1.4: Dari daftar "Perlu Ditinjau", user dapat mengonfirmasi manual ("ini balasan yang benar") — aksi ini yang baru mengubah status `BatchRecipient` menjadi `Reply` — atau mengabaikannya (dismiss, tidak mengubah apa pun).
- FR2-1.5: User dapat membuka balasan langsung di Gmail (deep link ke thread/email) tanpa perlu Pake Mail merender isi email penuh.
- FR2-1.6: User dapat memberi label manual pada balasan (mis. "Perlu jadwal ulang", "Auto-reply", "Bukan relevan") untuk membantu penyaringan visual, berlaku untuk semua tier.
- FR2-1.7: Sistem membedakan balasan otomatis (auto-reply "email diterima") dari balasan manusia sungguhan menggunakan heuristik dasar (mis. keyword umum, pengirim `no-reply@`) — ditandai berbeda, bukan disembunyikan (agar tidak ada balasan yang terlewat karena false negative). Heuristik ini berlaku lintas tier, termasuk hasil tier Confirmed.
- FR2-1.8: Exclude list untuk tier Indikasi (FR2-1.1) dapat diperluas dari waktu ke waktu berdasarkan pola noise yang ditemukan pasca-rilis — tidak perlu sempurna sejak awal, tapi harus mudah diperbarui tanpa deploy ulang aplikasi (mis. dikonfigurasi lewat data, bukan hardcode).

**Non-goals V2:** AI summary isi balasan, auto-reply balik dari sistem, matching berbasis isi email yang lebih canggih dari keyword sederhana (mis. NLP/AI-assisted matching) — dipertimbangkan untuk rilis jauh ke depan, bukan V2.

---

### 4.2 Dashboard Ringkasan

**Tujuan:** Halaman pertama yang langsung menjawab "bagaimana progres lamaran saya" tanpa buka menu lain.

**Requirements:**
- FR2-2.1: Menampilkan angka ringkasan: Total perusahaan, Total batch, Total email terkirim, Reply, Interview, Rejected, Accepted.
- FR2-2.2: Menampilkan **Recent Activity** (aktivitas terbaru lintas modul, mis. "Batch X selesai", "3 balasan baru").
- FR2-2.3: Menampilkan **Recent Replies** (ringkas, tarik dari Replies Module §4.1).
- FR2-2.4: Menampilkan **Running Batch** (batch yang sedang berjalan beserta progres singkat).
- FR2-2.5: Menampilkan **Upcoming Schedule** (batch yang dijadwalkan ke depan).
- FR2-2.6: Semua angka bisa diklik untuk langsung menuju modul terkait (mis. klik "Reply: 12" langsung ke Replies Module terfilter).

---

### 4.3 Smart Attachment

**Tujuan:** Mengurangi risiko human error saat memilih dokumen lampiran di wizard batch.

**Requirements:**
- FR2-3.1: Saat user memilih posisi/tag tertentu di Recipient (mis. tag "Frontend"), sistem otomatis menyarankan dokumen dengan kategori/tag yang cocok (mis. "CV Frontend", "Portfolio") pada Step 4 wizard batch.
- FR2-3.2: Saran bersifat **pre-selected tapi bisa diubah** — user tetap bisa menambah/menghapus dokumen manual, sistem tidak memaksa.
- FR2-3.3: Jika tidak ada dokumen yang cocok dengan tag posisi, sistem menampilkan notifikasi ringan "Belum ada dokumen bertag [X], pilih manual" — bukan error blocking.
- FR2-3.4: Pemetaan tag dokumen → posisi dapat dikustomisasi user di pengaturan Document Library (mis. user bisa mendefinisikan tag "Backend" terhubung ke dokumen "CV Backend Engineer").

---

### 4.4 Bounce/Error Visibility

**Tujuan:** Membuat status kegagalan pengiriman lebih mudah dipahami user awam, bukan hanya menampilkan error mentah dari server.

**Requirements:**
- FR2-4.1: Sistem mengkategorikan error umum ke bahasa yang dapat dipahami, misalnya:
  - `550 mailbox not found` → "Alamat email tidak valid atau tidak ditemukan"
  - `421/450 timeout/greylisting` → "Server penerima menolak sementara, sedang dicoba ulang otomatis"
  - `quota exceeded` → "Limit pengiriman harian akun email tercapai"
- FR2-4.2: Error mentah (raw log) tetap tersedia lewat opsi "Lihat detail teknis" untuk user yang butuh, tidak dihapus — hanya disembunyikan sebagai default.
- FR2-4.3: Kategori error yang bersifat permanen (mis. email tidak valid) menyarankan aksi ke user: "Perbarui email HR di Recipient Management?" — link langsung ke data terkait.

---

### 4.5 Reply Rate per Template

**Tujuan:** Versi ringan dari Analytics — membantu user tahu template mana yang paling efektif tanpa perlu modul Analytics penuh.

**Requirements:**
- FR2-5.1: Setiap Template Email menampilkan metrik ringkas: jumlah terkirim, jumlah reply, dan **reply rate (%)**.
- FR2-5.2: Metrik dihitung dari seluruh `BatchRecipient` historis yang menggunakan template tersebut, lintas batch.
- FR2-5.3: Daftar Template Email (§Modul 5 V1) diberi kolom/badge reply rate agar terlihat sekilas tanpa membuka detail.
- FR2-5.4: Jika sebuah template terkirim <10 kali, tampilkan indikator "data belum cukup" alih-alih angka persentase yang bisa menyesatkan.

---

### 4.6 Peringatan Re-apply

**Tujuan:** Mencegah user tanpa sadar melamar ke perusahaan yang sama dalam waktu dekat.

**Requirements:**
- FR2-6.1: Saat user memasukkan perusahaan ke Batch baru (Step 5 wizard), sistem mengecek riwayat `BatchRecipient` perusahaan tersebut.
- FR2-6.2: Jika perusahaan pernah dilamar dalam rentang waktu yang dapat dikonfigurasi (default 30 hari) dan belum ada balasan, tampilkan peringatan: *"PT X sudah dilamar 5 hari lalu (batch: Operator Bekasi), belum ada balasan. Tetap lanjutkan?"*
- FR2-6.3: User tetap bisa melanjutkan (bukan hard block) — ini peringatan, bukan larangan, karena ada kasus sah untuk re-apply (posisi berbeda, dsb).
- FR2-6.4: Peringatan tidak muncul jika status sebelumnya sudah `Reply`/`Interview`/dst — karena re-apply ke perusahaan yang sudah merespons punya konteks berbeda dan tidak perlu diperingatkan dengan cara sama.

---

### 4.7 Notifikasi Sederhana

**Tujuan:** Mengurangi kebutuhan user membuka aplikasi terus-menerus untuk sekadar mengecek progres.

**Requirements:**
- FR2-7.1: Sistem mengirim notifikasi (in-app, dan opsional email ringkas) saat: batch berstatus `Completed`, batch berstatus `Failed`/`Stopped` karena auto-stop, dan ada balasan baru terdeteksi (dari Replies Module).
- FR2-7.2: User dapat mengatur preferensi notifikasi per jenis event (mis. matikan notifikasi "batch selesai" tapi tetap aktifkan "ada balasan baru").
- FR2-7.3: Notifikasi in-app muncul sebagai badge counter di sidebar/topbar, dengan daftar riwayat notifikasi yang bisa ditandai "sudah dibaca".
- FR2-7.4: Notifikasi email (jika diaktifkan) dikirim maksimal 1 ringkasan per jam per user untuk mencegah spam ke inbox user sendiri (batching, bukan real-time per event).

---

## 5. Perubahan pada Model Data (Tambahan dari V1)

```
Reply (baru)
 ├── ref: BatchRecipient (1)
 ├── gmail_thread_id (nullable — kosong untuk tier Possible/Indikasi yang di luar thread)
 ├── gmail_message_id
 ├── sender_email
 ├── snippet
 ├── received_at
 ├── confidence_tier (enum: Confirmed, Likely, Possible, Indikasi)
 ├── matched_via (string, mis. "thread", "sender_exact", "domain", "company_name")
 ├── is_confirmed_by_user (boolean, hanya relevan untuk tier Possible/Indikasi — FR2-1.4)
 ├── is_likely_automated (boolean, heuristik auto-reply — FR2-1.7)
 └── user_label (nullable)

ExcludeListEntry (baru — untuk FR2-1.8)
 ├── pattern (string, mis. "noreply@", domain tertentu)
 └── created_at

Notification (baru)
 ├── ref: User
 ├── type (batch_completed / batch_failed / new_reply)
 ├── ref_id (batch_id atau reply_id, polymorphic ringan)
 ├── is_read
 └── created_at

DocumentTagMapping (baru)
 ├── ref: User
 ├── position_tag (string, mis. "Frontend")
 └── ref: Document (many-to-many)

EmailTemplate (perubahan)
 └── + computed field: sent_count, reply_count, reply_rate (dihitung dari BatchRecipient, tidak disimpan sebagai kolom statis — dihitung on-read atau di-cache berkala)

BatchRecipient (perubahan)
 └── + relasi 1..N ke Reply
```

**Catatan implementasi:** `reply_rate` sebaiknya **tidak** disimpan sebagai kolom yang di-update manual setiap kali ada balasan (rawan data stale) — lebih aman dihitung on-the-fly dengan cache periodik (mis. materialized view atau cron ringan setiap beberapa menit), mengingat volume data historis per user relatif kecil.

---

## 6. Kebutuhan Non-Fungsional Tambahan

| Kategori | Requirement |
|---|---|
| **Kuota API** | Polling Gmail API untuk Replies Module harus menghormati rate limit; gunakan Gmail Push Notification (Pub/Sub) jika volume user bertambah, bukan polling agresif per beberapa detik. |
| **Presisi vs Recall** | Untuk deteksi balasan otomatis vs manusia (FR2-1.6), lebih baik false positive (menampilkan auto-reply sebagai balasan) daripada false negative (balasan asli terlewat) — desain heuristik harus condong ke recall tinggi. |
| **Beban Notifikasi** | Batching notifikasi email (FR2-7.4) wajib, bukan opsional, untuk menjaga kepercayaan user terhadap kanal notifikasi (notifikasi berlebihan membuat user mematikan semuanya). |

---

## 7. Dependency terhadap V1

Fitur V2 murni membangun di atas data dan skema V1 — tidak ada perubahan yang mengharuskan migrasi ulang skema inti V1:
- Replies Module bergantung pada scope OAuth `gmail.readonly` yang sudah diminta sejak Fase 1 V1 — tidak perlu re-consent user (asumsi scope sudah benar sejak awal).
- Smart Attachment bergantung pada tag kategori Document Library yang sudah ada sejak V1 (FR-3.3).
- Peringatan Re-apply bergantung pada data historis `BatchRecipient` yang sudah terkumpul sejak batch pertama V1 berjalan.
- Reply Rate per Template murni query agregat dari data V1 yang sudah ada, tanpa kebutuhan data baru dari user.

---

## 8. Definition of Done V2

- [ ] Balasan email terdeteksi otomatis dan mengubah status `BatchRecipient` tanpa aksi manual user.
- [ ] Dashboard menampilkan seluruh metrik ringkasan dan dapat diklik menuju modul terkait.
- [ ] Wizard batch menyarankan dokumen otomatis berdasarkan tag posisi, tetap bisa diubah manual.
- [ ] Error pengiriman ditampilkan dalam bahasa yang dipahami user awam, dengan opsi lihat detail teknis.
- [ ] Setiap template menampilkan reply rate yang akurat dan diperbarui berkala.
- [ ] Sistem menampilkan peringatan (bukan blokir) saat user re-apply ke perusahaan yang baru dilamar dan belum dibalas.
- [ ] User menerima notifikasi in-app dan/atau email sesuai preferensi, tanpa spam berlebihan ke inbox.

---

## 9. Catatan Keputusan (Konteks Diskusi)

- **Outlook ditahan**, bukan dibatalkan permanen — keputusan ini diambil karena belum ada sinyal kebutuhan nyata dari user (bukan permintaan eksplisit atau data target market yang dominan Outlook). Direkomendasikan dievaluasi ulang di V2.1 setelah ada data adopsi nyata.
- **Optimasi Modul Batch** (preset, duplicate batch, smart defaults) dipertimbangkan tapi **tidak jadi masuk V2** atas keputusan eksplisit — dicatat di sini agar tidak hilang dari histori pertimbangan, dan bisa diangkat kembali di rilis berikutnya jika user feedback menunjukkan wizard batch terasa repetitif.

---

## 10. Roadmap Setelah V2

| Rilis | Fokus Utama (kandidat, belum final) |
|---|---|
| **V2.1** | Evaluasi ulang Outlook, evaluasi ulang optimasi Batch berdasarkan feedback V2 |
| **V2.2+** | Job Pipeline drag-and-drop penuh (setelah Replies Module terbukti stabil), Analytics mendalam, AI Summary balasan |
| **V3** | Auto-resend lamaran yang belum dibalas (lihat §10.1) |

### 10.1 V3 (Preview) — Auto-Resend

Keputusan awal hasil diskusi, dicatat di sini supaya konteksnya tidak hilang saat V3 mulai dirancang detail:

- **Trigger fully automatic** — begitu threshold waktu terlampaui dan belum ada balasan, sistem mengirim ulang secara otomatis (bukan sekadar reminder pasif seperti rencana awal "Follow Up Reminder").
- **Tidak menggunakan sinyal "sudah dibuka" (open/view tracking).** Tracking pixel di body email dipertimbangkan tapi ditolak karena tidak reliable (banyak email client memblokir load gambar otomatis) dan berisiko memicu spam filter. Tracking lewat attachment (CV/PDF) ditolak lebih tegas lagi — attachment tidak otomatis ter-render saat email dibuka, dan menyisipkan trigger resource eksternal ke PDF adalah pola yang dikenali sebagai indikasi phishing oleh email security scanner; risikonya bisa membuat lampiran CV user ikut ter-flag berbahaya oleh sistem keamanan perusahaan tujuan.
- **Threshold murni berbasis waktu** sejak email pertama terkirim (bukan kombinasi dengan status "Viewed").
- **Threshold dapat dikustomisasi oleh user**, bukan dipatok 7 atau 14 hari — dengan catatan tetap perlu ada **batas minimum** (guard rail, kandidat: 5–7 hari) supaya user tidak bisa mengatur threshold terlalu agresif hingga terasa spam ke HR.
- **Pengaturan threshold dua tingkat**: default global (Settings) yang bisa di-override per batch — kombinasi ini dipilih supaya user tidak perlu mengatur ulang tiap kali membuat batch baru, tapi tetap fleksibel untuk batch dengan karakteristik berbeda.
- **Tetap ada approval window** sebelum resend benar-benar terkirim (mis. notifikasi "akan resend ke N perusahaan besok jam X, batalkan?") — supaya "fully automatic" tidak berarti user kehilangan kendali sepenuhnya.
- **Template follow-up menggunakan template lamaran awal apa adanya** (reuse, bukan template terpisah) — dipilih demi kesederhanaan implementasi. Konsekuensinya: threshold waktu minimum (guard rail 5–7 hari) menjadi satu-satunya pengaman utama supaya email yang identik tidak terkesan spam/bug di mata HR, karena tidak ada pembeda konten pada email susulan.
- **Batas jumlah resend per perusahaan dapat diatur user** (bukan hard limit tetap), mengikuti pola yang sama dengan threshold waktu. Sama seperti threshold waktu, ini butuh **batas atas** sebagai guard rail (kandidat: maksimal 3x, default 1x) — tanpa batas atas, user bisa mengatur resend berkali-kali hingga berisiko akun ter-flag spam oleh HR/provider email.
- **Auto-resend melewati (skip) pengecekan Peringatan Re-apply (§4.6 PRD V2).** Peringatan itu dirancang untuk mencegah user *tidak sadar* mengirim ulang ke perusahaan yang sama lewat wizard batch manual — sedangkan auto-resend memang diniatkan untuk re-apply ke perusahaan yang sama, sehingga peringatan tersebut tidak relevan dan sebaiknya tidak muncul di alur resend otomatis.