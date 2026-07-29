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

**Tujuan:** Mengambil balasan email secara otomatis dan memperbarui status lamaran tanpa user harus buka Gmail.

**Requirements:**
- FR2-1.1: Sistem melakukan polling/webhook ke Gmail API (scope `gmail.readonly` yang sudah didapat sejak V1) untuk mendeteksi balasan baru pada thread pengiriman lamaran.
- FR2-1.2: Setiap balasan yang terdeteksi otomatis mengubah status `BatchRecipient` dari `Sent`/`Applied` menjadi `Reply`.
- FR2-1.3: User dapat melihat daftar balasan terbaru (subject, cuplikan singkat, waktu, nama perusahaan terkait) di satu halaman terpusat.
- FR2-1.4: User dapat membuka balasan langsung di Gmail (deep link ke thread) tanpa perlu Pake Mail merender isi email penuh.
- FR2-1.5: User dapat memberi label manual pada balasan (mis. "Perlu jadwal ulang", "Auto-reply", "Bukan relevan") untuk membantu penyaringan visual.
- FR2-1.6: Sistem membedakan balasan otomatis (auto-reply "email diterima") dari balasan manusia sungguhan menggunakan heuristik dasar (mis. keyword umum, pengirim `no-reply@`) — ditandai berbeda, bukan disembunyikan (agar tidak ada balasan yang terlewat karena false negative).

**Non-goals V2:** AI summary isi balasan, auto-reply balik dari sistem.

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
 ├── gmail_thread_id
 ├── snippet
 ├── received_at
 ├── is_likely_automated (boolean, heuristik)
 └── user_label (nullable)

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
