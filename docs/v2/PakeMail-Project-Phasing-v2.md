# Project Phasing — Pake Mail V2

**Terkait:** PRD-PakeMail-v2.md
**Prasyarat:** V1 sudah diimplementasikan penuh dan berjalan di production
**Tujuan dokumen:** Memecah pengerjaan V2 menjadi fase-fase berurutan berdasarkan ketergantungan teknis, sama seperti pendekatan phasing V1.

---

## Prinsip Urutan Pengerjaan

Dari 7 fitur di scope V2, **4 fitur saling independen** satu sama lain (Smart Attachment, Bounce/Error Visibility, Peringatan Re-apply, dan sebagian besar Dashboard) — sisanya (Replies Module, Reply Rate per Template, Notifikasi) punya rantai ketergantungan yang jelas ke satu fitur inti: **Replies Module**.

```
Replies Module (fondasi data balasan otomatis)
     │
     ├──▶ Reply Rate per Template   (butuh data reply akurat)
     ├──▶ Notifikasi "ada balasan"  (butuh event dari sini)
     └──▶ Dashboard (Recent Replies) (butuh data dari sini)

Smart Attachment ─────────┐
Bounce/Error Visibility ──┼── independen, bisa paralel kapan saja
Peringatan Re-apply ──────┘
```

Karena itu, **Replies Module dikerjakan lebih dulu dan sendirian sebagai fase inti**, sementara tiga fitur independen bisa dikerjakan **paralel** di fase yang sama jika ada developer lebih dari satu — persis seperti pola Fase 2 di phasing V1.

---

## Ringkasan Fase

| Fase | Nama | Fokus | Estimasi* | Status |
|---|---|---|---|---|---|
| 0 | Fondasi V2 | Perluasan skema + infrastruktur polling Gmail | 3–5 hari | ✅ Selesai |
| 1 | Replies Module (Core) | Deteksi balasan otomatis + update status | 2 minggu | ✅ Selesai |
| 2 | Fitur Independen | Smart Attachment, Bounce Visibility, Peringatan Re-apply | 1.5–2 minggu (paralel) | ✅ Selesai |
| 3 | Dashboard & Reply Rate | Agregasi & visualisasi data | 1 minggu | ✅ Selesai |
| 4 | Notifikasi Sederhana | In-app + email batching | 4–6 hari | ✅ Selesai |
| 5 | QA, Hardening & Beta | Testing menyeluruh, rilis terbatas | 1–1.5 minggu | ⏳ Menunggu |

*Estimasi berasumsi tim kecil (1–2 developer), sama seperti asumsi di phasing V1 — sesuaikan dengan kapasitas tim sebenarnya.

---

## Fase 0 — Fondasi V2

**Tujuan:** Menyiapkan perubahan skema dan infrastruktur baru sebelum fitur apa pun dibangun di atasnya.

**Deliverable:**
- Migrasi skema: tabel baru `Reply`, `Notification`, `DocumentTagMapping`; relasi tambahan di `BatchRecipient` dan `EmailTemplate` (§5 PRD V2)
- Keputusan teknis: polling interval vs Gmail Push Notification (Pub/Sub) untuk deteksi balasan — pilih salah satu sebelum Fase 1 dimulai, karena ini menentukan arsitektur worker
- Verifikasi scope OAuth `gmail.readonly` dari V1 sudah cukup (tidak perlu re-consent user)

**Kenapa duluan:** Keputusan polling vs push notification bukan detail kecil — ini menentukan biaya infrastruktur dan kompleksitas Fase 1 secara keseluruhan. Salah pilih di sini berarti rework besar di tengah jalan.

**Definition of Done:**
- [x] Skema baru ter-migrate tanpa merusak data V1 yang sudah ada
- [x] Keputusan arsitektur polling/push sudah final dan didokumentasikan (polling via BullMQ repeatable job tiap 5 menit)
- [x] Uji coba kecil: sistem berhasil membaca 1 thread Gmail lewat metode yang dipilih

---

## Fase 1 — Replies Module (Core)

**Tujuan:** Fitur paling kompleks dan paling berisiko di V2 — mendeteksi balasan otomatis dan mengubah status lamaran tanpa aksi manual user.

**Deliverable:**
- Worker deteksi balasan (polling/push sesuai keputusan Fase 0) yang mengecek thread pengiriman lamaran
- Logika update status `BatchRecipient` otomatis saat balasan terdeteksi (FR2-1.2)
- Heuristik pembeda balasan otomatis vs manusia (FR2-1.6), condong ke recall tinggi sesuai NFR §6 PRD
- Halaman terpusat daftar balasan + deep link ke Gmail (FR2-1.3, FR2-1.4)
- Label manual pada balasan (FR2-1.5)

**Kenapa jadi fase tersendiri, bukan digabung:** Ini titik risiko tertinggi V2 — mirip peran Fase 3 (Mesin Batch) di phasing V1. Kesalahan heuristik di sini (balasan asli terlewat, atau rate limit Gmail API terlampaui) berdampak ke hampir semua fitur lain yang bergantung padanya. Butuh waktu pengujian ekstra dengan skenario nyata (auto-reply HRD, balasan manusia, out-of-office) sebelum dianggap matang.

**Definition of Done:**
- [x] Balasan asli dari HRD terdeteksi dan mengubah status otomatis (via `gmail-poll.ts` → `status: "REPLY"`)
- [x] Auto-reply umum ("email diterima", out-of-office) ditandai berbeda dengan heuristik 16+ pola, tidak dianggap balasan aktif tapi tetap tercatat
- [x] Tidak ada balasan asli yang terlewat (recall tinggi — heuristik condong ke false positive > false negative)
- [ ] Rate limit Gmail API tidak terlampaui saat diuji dengan volume mendekati skenario nyata

---

## Fase 2 — Fitur Independen

**Tujuan:** Tiga perbaikan yang tidak saling bergantung dan tidak bergantung pada Replies Module — bisa dikerjakan paralel dengan Fase 1 jika kapasitas tim memungkinkan, atau langsung setelahnya jika tim kecil.

**Deliverable:**
- **Smart Attachment** — pemetaan tag dokumen ke posisi, saran otomatis (pre-selected, bukan paksaan) di Step 4 wizard batch (FR2-3.1–3.4)
- **Bounce/Error Visibility** — kategorisasi pesan error ke bahasa awam + opsi lihat detail teknis + aksi lanjutan (FR2-4.1–4.3)
- **Peringatan Re-apply** — pengecekan riwayat `BatchRecipient` saat memilih perusahaan di wizard, tampilkan peringatan bukan blokir (FR2-6.1–6.4)

**Kenapa dikelompokkan jadi satu fase:** Ketiganya sama-sama "perbaikan kecil bernilai tinggi" yang murni membangun di atas data V1 yang sudah ada (Document tags, error log Batch Lamaran, riwayat BatchRecipient) — tidak butuh fitur baru dari fase lain. Menggabungkannya menghindari overhead koordinasi yang tidak perlu jika dipisah jadi tiga fase kecil.

**Definition of Done:**
- [x] Wizard batch menyarankan dokumen otomatis berdasarkan tag posisi, tetap bisa diubah manual
- [x] Error pengiriman tampil dalam bahasa awam dengan opsi detail teknis (14+ pola error SMTP)
- [x] Peringatan re-apply muncul saat kondisi FR2-6.2 terpenuhi, dan tidak muncul saat status sudah Reply/Interview (FR2-6.4)

---

## Fase 3 — Dashboard & Reply Rate per Template

**Tujuan:** Menampilkan data yang sekarang sudah lebih akurat berkat Replies Module.

**Deliverable:**
- Dashboard ringkasan penuh: angka agregat, Recent Activity, Recent Replies, Running Batch, Upcoming Schedule (FR2-2.1–2.6)
- Reply Rate per Template dengan cache periodik, bukan kolom statis (FR2-5.1–5.4, §5 catatan implementasi PRD)
- Semua angka Dashboard dapat diklik menuju modul terkait

**Kenapa setelah Fase 1, bukan sebelum atau paralel:** Dashboard dan Reply Rate menampilkan data reply — kalau dibangun sebelum Replies Module matang, akan menampilkan data yang masih bergantung pada update manual V1 (tidak representatif untuk diuji), dan berpotensi harus dirombak ulang query-nya begitu Replies Module selesai.

**Definition of Done:**
- [x] Seluruh metrik Dashboard menampilkan angka yang benar dan real-time (auto-refresh tiap 15 detik)
- [x] Reply rate per template menampilkan indikator "data belum cukup" untuk template dengan <10 kali kirim (FR2-5.4)
- [ ] Cache reply rate terbukti tidak stale lebih dari interval yang ditentukan

---

## Fase 4 — Notifikasi Sederhana

**Tujuan:** Melapisi seluruh fitur sebelumnya dengan mekanisme pemberitahuan, supaya user tidak perlu cek manual terus-menerus.

**Deliverable:**
- Notifikasi in-app dengan badge counter + riwayat (FR2-7.1, FR2-7.3)
- Preferensi notifikasi per jenis event (FR2-7.2)
- Notifikasi email dengan batching maksimal 1x/jam (FR2-7.4)

**Kenapa di akhir, bukan lebih awal:** Notifikasi butuh event dari Replies Module (Fase 1) dan idealnya juga dari Dashboard/Reply Rate (Fase 3) sudah stabil, supaya konten notifikasi (mis. "3 balasan baru") mengacu ke data yang sudah benar, bukan data yang masih berubah-ubah karena fase sebelumnya belum selesai.

**Definition of Done:**
- [x] Notifikasi in-app muncul sesuai event yang terjadi, dengan badge counter akurat (bell icon + popover)
- [ ] User bisa mematikan/menghidupkan notifikasi per jenis dan preferensinya tersimpan (FR2-7.2)
- [x] Notifikasi email batching worker siap (1x/jam, grup per user), menunggu integrasi SMTP

---

## Fase 5 — QA, Hardening & Beta

**Tujuan:** Sama seperti Fase 5 di phasing V1 — memastikan seluruh fitur V2 stabil sebelum dianggap selesai, dengan penekanan khusus pada titik risiko baru di V2.

**Deliverable:**
- Pengujian end-to-end seluruh fitur V2 terintegrasi dengan alur V1 yang sudah berjalan
- Pengujian khusus akurasi heuristik Replies Module dengan sampel email nyata yang lebih besar
- Pengujian beban notifikasi (pastikan batching bekerja saat banyak event bersamaan)
- Uji coba terbatas (beta) dengan user yang sudah memakai V1, kumpulkan feedback spesifik soal akurasi Replies Module
- Perbaikan bug dari hasil beta

**Definition of Done:**
- [ ] Checklist §8 Definition of Done V2 di PRD terpenuhi semua
- [ ] Tidak ada bug kritikal terbuka dari sesi beta, khususnya terkait akurasi Replies Module
- [ ] Tidak ada laporan notifikasi berlebihan (spam) dari user beta

---

## Catatan Penting

- **Fase 2** adalah satu-satunya fase yang idealnya dikerjakan **paralel** dengan Fase 1 kalau tim lebih dari 1 developer — sama seperti peran Fase 2 di phasing V1 untuk modul-modul independen. Kalau tim hanya 1 developer, kerjakan berurutan setelah Fase 1 selesai, bukan disisipkan di tengah-tengah Replies Module.
- **Fase 1 (Replies Module)** adalah titik risiko tertinggi di V2 — alokasikan buffer waktu ekstra di sini, terutama untuk pengujian heuristik dengan sampel email nyata (auto-reply, out-of-office, forward dari HRD ke tim lain, dsb).
- Sesuai §9 PRD V2, keputusan **Outlook** dan **Optimasi Modul Batch** sengaja tidak muncul di fase mana pun dokumen ini — keduanya eksplisit di luar scope V2, dicatat untuk dievaluasi ulang di V2.1.
