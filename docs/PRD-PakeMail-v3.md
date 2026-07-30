# Product Requirements Document (PRD)
## Pake Mail (PM) — V3

**Versi Dokumen:** 3.0
**Status:** Draft untuk Review
**Prasyarat:** V1 & V2 sudah diimplementasikan penuh (termasuk Replies Module, yang jadi syarat mutlak V3 bisa tahu status "belum ada balasan")

---

## 1. Ringkasan Eksekutif

V2 menutup celah "user harus cek Gmail manual" lewat Replies Module. Tapi masih ada satu perilaku manual yang tersisa: **follow-up ke perusahaan yang belum membalas**. Di V1/V2, kalau HR tidak merespons dalam waktu lama, satu-satunya jalan adalah user membuat batch baru secara manual — sesuatu yang gampang terlewat atau terlupa di tengah puluhan/ratusan lamaran yang sedang berjalan.

V3 punya satu fitur utama: **Auto-Resend** — mengirim ulang lamaran secara otomatis ke perusahaan yang belum membalas dalam jangka waktu tertentu, tanpa user harus mengingat dan bikin batch baru sendiri.

Ini fitur dengan potensi risiko reputasi paling tinggi dari semua yang pernah dirancang di Pake Mail (V1–V3), karena menyangkut mengirim email ke penerima yang sama lebih dari sekali secara otomatis. Karena itu, seluruh requirement di dokumen ini dirancang dengan **guard rail eksplisit** di setiap sudut — bukan sekadar "kirim ulang kalau belum dibalas".

---

## 2. Tujuan & Prinsip Desain

| Tujuan | Prinsip |
|---|---|
| Mengurangi follow-up manual yang gampang terlupa | Otomatis secara default, tapi tetap ada jendela kontrol sebelum eksekusi |
| Menjaga reputasi akun email pengirim | Guard rail wajib di setiap parameter yang bisa diatur user (bukan bebas mutlak) |
| Tidak menambah kompleksitas berlebihan | Reuse komponen yang sudah ada (template, threshold pattern) alih-alih membangun modul baru |

**Prinsip kunci yang disepakati selama perancangan** (dicatat di sini karena jadi dasar keputusan requirement di bawah):
- Tidak menggunakan sinyal "email dibuka" (tracking pixel) — terbukti tidak reliable dan berisiko memicu spam filter (lihat §9 Catatan Keputusan PRD V2).
- Threshold murni berbasis waktu sejak email pertama terkirim.
- "Fully automatic" tidak berarti "tanpa kendali" — tetap ada jendela persetujuan (approval window) sebelum resend benar-benar terkirim.

---

## 3. Ruang Lingkup V3

### 3.1 In-Scope
- Auto-Resend: konfigurasi threshold waktu (global + override per batch)
- Batas jumlah resend per perusahaan (custom, dengan guard rail)
- Approval window sebelum resend dieksekusi
- Reuse template lamaran awal (tanpa template follow-up terpisah)
- Interaksi eksplisit dengan Peringatan Re-apply (V2): auto-resend melewati pengecekan tersebut

### 3.2 Eksplisit Out-of-Scope V3
- **Template follow-up terpisah** — diputuskan reuse template awal apa adanya (lihat §9.1 Catatan Keputusan PRD V2 untuk konteks trade-off-nya)
- **Open/view tracking** (tracking pixel di body maupun attachment) — ditolak permanen sebagai basis threshold, bukan sekadar ditunda
- **Personalisasi otomatis isi follow-up** (mis. AI menyusun ulang kalimat supaya tidak identik) — kandidat menarik untuk rilis setelah V3, tapi menambah kompleksitas yang belum perlu di V3
- Fitur-fitur yang masih tertahan dari V2 (Outlook, Optimasi Batch) — tetap di luar scope, tidak otomatis masuk V3 hanya karena V3 sedang dirancang

---

## 4. Functional Requirements

### 4.1 Konfigurasi Threshold & Batas Resend

**Tujuan:** Memberi user kontrol penuh atas kapan dan berapa kali resend terjadi, tanpa membuka celah penyalahgunaan yang merusak reputasi pengiriman.

**Requirements:**
- FR3-1.1: Tersedia pengaturan **default global** di Settings: aktif/nonaktifkan Auto-Resend, threshold hari (jumlah hari sejak email pertama terkirim sebelum resend dijadwalkan), dan jumlah maksimal resend per perusahaan.
- FR3-1.2: Setiap Batch dapat **override** ketiga pengaturan di atas secara individual di Step 6 wizard (Atur Jadwal) — jika tidak diubah, otomatis mewarisi default global.
- FR3-1.3: Threshold hari memiliki **batas bawah (minimum guard rail)**: tidak bisa diatur kurang dari **5 hari**. Sistem menolak input di bawah batas ini dengan pesan jelas, bukan sekadar validasi diam.
- FR3-1.4: Jumlah maksimal resend memiliki **batas atas (guard rail)**: tidak bisa diatur lebih dari **3 kali** per perusahaan. Default sistem adalah **1 kali** jika user tidak mengubah.
- FR3-1.5: Auto-Resend nonaktif secara default untuk batch yang dibuat dari V1/V2 sebelum V3 dirilis (tidak retroaktif otomatis) — user harus mengaktifkan secara sadar per batch atau lewat default global yang baru diset.

---

### 4.2 Logika Trigger & Penjadwalan

**Tujuan:** Menentukan kapan sebuah `BatchRecipient` memenuhi syarat untuk dijadwalkan resend.

**Requirements:**
- FR3-2.1: Sistem mengevaluasi setiap `BatchRecipient` berstatus `Sent`/`Applied` (bukan `Reply`, `Interview`, `Failed`, `Skipped`, atau status lanjutan lain) terhadap threshold waktu yang berlaku (override batch atau default global).
- FR3-2.2: Begitu waktu sejak `sent_at` melewati threshold **dan** jumlah resend saat ini belum mencapai batas maksimal, sistem menjadwalkan resend dan memasuki masa **approval window** (§4.3) — bukan langsung terkirim.
- FR3-2.3: Jika balasan masuk (terdeteksi Replies Module) kapan pun sebelum resend benar-benar terkirim — termasuk saat sedang dalam approval window — jadwal resend otomatis dibatalkan.
- FR3-2.4: Auto-Resend **tidak** mempertimbangkan status "dibuka"/"belum dibuka" dalam bentuk apa pun — murni berbasis waktu sesuai keputusan desain di §2.

---

### 4.3 Approval Window

**Tujuan:** Memastikan "fully automatic" tetap memberi user kesempatan terakhir untuk melihat dan membatalkan sebelum email benar-benar terkirim ulang.

**Requirements:**
- FR3-3.1: Setelah sebuah resend dijadwalkan (FR3-2.2), sistem menunggu masa approval window (kandidat default: **24 jam**, dapat dikonfigurasi di Settings) sebelum benar-benar mengeksekusi pengiriman.
- FR3-3.2: Selama approval window, user menerima notifikasi (memanfaatkan Notifikasi Sederhana dari V2): *"N perusahaan akan menerima resend otomatis pada [tanggal/jam]. Tinjau atau batalkan?"*
- FR3-3.3: User dapat membatalkan resend untuk perusahaan tertentu secara individual, atau membatalkan seluruh batch resend sekaligus, dari daftar yang ditampilkan.
- FR3-3.4: Jika user tidak melakukan apa pun selama approval window, resend tetap terkirim sesuai jadwal (default: lanjut otomatis, bukan butuh konfirmasi aktif) — approval window ini adalah jendela veto, bukan jendela persetujuan wajib.

---

### 4.4 Eksekusi Resend

**Tujuan:** Mengirim ulang email dengan aman, konsisten dengan mekanisme pengiriman yang sudah ada di Batch Lamaran V1.

**Requirements:**
- FR3-4.1: Resend menggunakan **template yang sama persis** dengan pengiriman awal (subject, body, penutup, lampiran) — tidak ada modifikasi konten otomatis (sesuai keputusan §9 PRD V2).
- FR3-4.2: Resend tetap tunduk pada delay antar email, jam aktif, dan hari aktif yang berlaku di level akun/batch — resend tidak dikecualikan dari aturan anti-spam yang sudah ada di Mesin Batch V1.
- FR3-4.3: Resend tetap tunduk pada Auto-Stop (V1) — jika resend menyebabkan failure/bounce rate tinggi, mekanisme Auto-Stop yang sama berlaku dan menghentikan proses.
- FR3-4.4: Setiap resend tercatat sebagai entri baru di Activity Log dan menambah `resend_count` pada `BatchRecipient` terkait.
- FR3-4.5: Resend **tidak** memicu ulang Peringatan Re-apply (§4.6 PRD V2) — perilaku ini eksklusif untuk jalur otomatis Auto-Resend, Peringatan Re-apply tetap berlaku normal untuk wizard batch manual.

---

## 5. Perubahan pada Model Data (Tambahan dari V2)

```
Settings (perluasan, jika belum ada tabel Settings — buat baru jika perlu)
 ├── ref: User
 ├── resend_enabled_default (boolean)
 ├── resend_threshold_days_default (int, min 5)
 ├── resend_max_count_default (int, 1–3)
 └── resend_approval_window_hours (int, default 24)

Batch (perubahan — override opsional dari Settings)
 ├── resend_enabled_override (boolean, nullable)
 ├── resend_threshold_days_override (int, nullable, min 5 jika diisi)
 └── resend_max_count_override (int, nullable, 1–3 jika diisi)

BatchRecipient (perubahan)
 ├── resend_count (int, default 0)
 ├── last_resend_at (datetime, nullable)
 └── next_resend_scheduled_at (datetime, nullable) — dipakai untuk approval window

ResendSchedule (baru — merepresentasikan satu jadwal resend yang sedang dalam approval window)
 ├── ref: BatchRecipient
 ├── scheduled_send_at (datetime — kapan resend akan benar-benar terkirim jika tidak dibatalkan)
 ├── status (PendingApproval / Cancelled / Sent)
 └── created_at
```

**Catatan implementasi:** `ResendSchedule` sengaja dipisah dari `BatchRecipient` (bukan sekadar field boolean) supaya riwayat pembatalan/eksekusi resend tetap tercatat rapi, dan approval window bisa dibatalkan per-item tanpa mengganggu status utama `BatchRecipient`.

---

## 6. Kebutuhan Non-Fungsional

| Kategori | Requirement |
|---|---|
| **Reputasi Pengiriman** | Resend harus melalui job queue dan aturan delay/auto-stop yang sama persis dengan pengiriman awal (FR3-4.2, FR3-4.3) — tidak ada jalur pintas yang melewati proteksi anti-spam yang sudah dibangun sejak V1. |
| **Guard Rail sebagai Hard Constraint** | Batas minimum threshold (5 hari) dan batas maksimum jumlah resend (3x) harus divalidasi di level backend, bukan hanya di UI — mencegah manipulasi lewat API langsung. |
| **Transparansi** | User harus selalu bisa melihat riwayat resend per perusahaan (kapan, keberapa kali) dari layar monitoring/detail perusahaan yang sudah ada sejak V1. |
| **Reversibilitas** | Pembatalan resend individual (FR3-3.3) harus efektif hingga detik terakhir sebelum job pengiriman benar-benar dieksekusi oleh worker. |

---

## 7. Dependency terhadap V1 & V2

- **Replies Module (V2)** adalah prasyarat mutlak — tanpa deteksi balasan otomatis yang akurat, sistem tidak punya cara reliable untuk tahu kapan harus membatalkan resend (FR3-2.3). Mengaktifkan Auto-Resend sebelum Replies Module terbukti stabil di production berisiko mengirim resend ke perusahaan yang sebenarnya sudah membalas.
- **Job Queue & Auto-Stop (V1)** dipakai ulang sepenuhnya, tidak dibangun ulang — resend hanyalah jenis job baru yang masuk ke infrastruktur pengiriman yang sudah ada.
- **Notifikasi Sederhana (V2)** dipakai ulang untuk approval window (FR3-3.2) — tidak perlu kanal notifikasi baru.
- **Peringatan Re-apply (V2)** tetap ada dan tidak berubah untuk alur manual; hanya dikecualikan secara eksplisit untuk jalur Auto-Resend (FR3-4.5).

---

## 8. Definition of Done V3

- [ ] User bisa mengatur threshold & batas resend secara global maupun per batch, dengan guard rail (min 5 hari, maks 3x) tervalidasi di backend.
- [ ] Sistem menjadwalkan resend secara otomatis saat threshold terlampaui dan belum ada balasan.
- [ ] Approval window berjalan sesuai durasi yang dikonfigurasi, dan user berhasil membatalkan resend individual maupun massal dalam pengujian.
- [ ] Resend yang tidak dibatalkan terkirim otomatis setelah approval window berakhir, menggunakan template awal apa adanya.
- [ ] Balasan yang masuk selama approval window terbukti membatalkan jadwal resend terkait secara otomatis.
- [ ] Resend tetap tunduk pada delay, jam aktif, hari aktif, dan Auto-Stop yang sudah ada — teruji tidak melewati proteksi ini.
- [ ] Resend terbukti tidak memicu Peringatan Re-apply, sementara wizard batch manual tetap memicunya seperti biasa.
- [ ] Riwayat resend per perusahaan (jumlah & waktu) terlihat jelas dari layar monitoring.

---

## 9. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Resend dianggap spam oleh HR karena isi identik dengan email pertama | Guard rail minimum 5 hari + maksimal 3x resend membatasi paparan; dicatat sebagai trade-off sadar dari keputusan reuse template (§9.1 PRD V2) |
| Resend terkirim ke perusahaan yang sebenarnya sudah membalas (false negative Replies Module) | Approval window 24 jam memberi jendela terakhir bagi balasan yang datang terlambat terdeteksi untuk membatalkan resend; V3 tidak dirilis sebelum akurasi Replies Module (V2) tervalidasi di production |
| User mengatur threshold/batas resend secara sembarangan lewat API langsung, melewati guard rail UI | Validasi guard rail wajib di backend (§6 NFR), bukan hanya di frontend |
| Auto-Stop V1 tidak cukup sensitif terhadap resend yang menyebabkan bounce baru | Resend dihitung dalam perhitungan failure rate Auto-Stop yang sama, tidak dipisah sebagai kategori terpisah yang bisa "lolos" dari threshold |

---

## 10. Roadmap Setelah V3

| Rilis | Fokus Utama (kandidat, belum final) |
|---|---|
| **V3.1** | Evaluasi hasil Auto-Resend di production (reply rate setelah resend, keluhan HR jika ada) sebelum mempertimbangkan personalisasi otomatis isi follow-up |
| **V3.2+** | Kembali evaluasi Outlook, Optimasi Batch, Job Pipeline penuh, dan Analytics mendalam yang masih tertahan dari V2 |
