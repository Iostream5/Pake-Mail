# Project Phasing — Pake Mail V3

**Terkait:** PRD-PakeMail-v3.md
**Prasyarat:** V1 & V2 sudah diimplementasikan penuh dan berjalan di production
**Tujuan dokumen:** Memecah pengerjaan V3 (Auto-Resend) menjadi fase-fase berurutan berdasarkan ketergantungan teknis, mengikuti pola phasing V1 & V2.

---

## Gerbang Sebelum Mulai (Bukan Fase, tapi Syarat Wajib)

Berbeda dari V1 dan V2, V3 punya satu prasyarat yang **tidak bisa dilewati begitu saja** sebelum Fase 0 dimulai: **akurasi Replies Module (V2) harus sudah tervalidasi di production**, bukan sekadar "sudah dikerjakan di kode".

Alasannya sudah dicatat di §7 PRD V3: kalau deteksi balasan masih sering meleset (balasan asli tidak terdeteksi), Auto-Resend bisa mengirim ulang ke perusahaan yang sebenarnya sudah membalas — ini bukan bug kecil, tapi langsung merusak kepercayaan user terhadap fitur inti V3 sejak hari pertama.

**Sebelum Fase 0 dimulai, pastikan:**
- [ ] Replies Module sudah berjalan di production minimal beberapa minggu dengan volume nyata
- [ ] Tidak ada laporan signifikan soal balasan asli yang terlewat (false negative) dari user V2
- [ ] Tim punya angka akurasi kasar (mis. dari sampling manual) sebagai baseline pembanding setelah V3 rilis

Kalau syarat ini belum terpenuhi, **tunda mulai Fase 0** — mengerjakan V3 di atas Replies Module yang belum teruji sama saja membangun fitur berisiko tinggi di atas fondasi yang belum stabil.

---

## Prinsip Urutan Pengerjaan

V3 secara scope memang hanya satu fitur besar (Auto-Resend), tapi fitur ini punya rantai ketergantungan internal yang ketat — beda dengan V1/V2 yang punya beberapa modul independen yang bisa paralel. Hampir seluruh fase V3 **berurutan secara linear**, karena setiap fase adalah prasyarat teknis langsung untuk fase berikutnya:

```
Konfigurasi (threshold & batas)
        │
        ▼
Logika Trigger & Penjadwalan (butuh konfigurasi utk tau kapan trigger)
        │
        ▼
Approval Window (butuh jadwal resend utk tau apa yg mau di-approve)
        │
        ▼
Eksekusi Resend (butuh approval window selesai utk tau kapan benar2 kirim)
```

Tidak ada fase yang bisa dikerjakan paralel secara berarti di V3 — ini beda dari pola V1 (Fase 2) dan V2 (Fase 2) yang punya modul independen.

---

## Ringkasan Fase

| Fase | Nama | Fokus | Estimasi* |
|---|---|---|---|
| 0 | Fondasi V3 | Migrasi skema + guard rail backend | 3–4 hari |
| 1 | Konfigurasi Threshold & Batas | Settings global + override per batch | 3–4 hari |
| 2 | Logika Trigger & Penjadwalan | Evaluasi otomatis + pembatalan saat ada balasan | 1–1.5 minggu |
| 3 | Approval Window | Notifikasi + pembatalan individual/massal | 4–6 hari |
| 4 | Eksekusi Resend | Pengiriman ulang terintegrasi ke job queue V1 | 1 minggu |
| 5 | QA, Hardening & Beta Terbatas | Validasi menyeluruh sebelum rilis penuh | 1.5–2 minggu |

*Estimasi berasumsi tim kecil (1–2 developer), konsisten dengan asumsi di phasing V1 & V2. Fase 5 sengaja diberi alokasi lebih panjang dari pola V1/V2 karena tingkat risiko reputasi V3 yang lebih tinggi.

---

## Fase 0 — Fondasi V3

**Tujuan:** Menyiapkan skema data dan memastikan guard rail tervalidasi di level yang benar sebelum fitur apa pun dibangun di atasnya.

**Deliverable:**
- Migrasi skema: tabel `Settings` (jika belum ada), field override di `Batch`, field baru di `BatchRecipient`, tabel baru `ResendSchedule` (§5 PRD V3)
- Validasi backend untuk guard rail: threshold minimum 5 hari, batas maksimal resend 3x — diimplementasikan di layer API/service, bukan hanya di form frontend
- Uji unit khusus guard rail: pastikan request langsung ke API dengan nilai di luar batas ditolak, bukan hanya divalidasi di UI

**Kenapa duluan:** Guard rail adalah pertahanan utama V3 terhadap risiko reputasi (§6 NFR PRD V3). Menunda validasi backend ke fase belakangan membuka celah — bahkan sementara — di mana nilai berbahaya bisa masuk lewat jalur lain (API langsung, bug UI, dsb).

**Definition of Done:**
- [ ] Skema baru ter-migrate tanpa merusak data V1/V2 yang sudah ada
- [ ] Percobaan set threshold <5 hari atau batas resend >3x lewat API langsung berhasil ditolak sistem
- [ ] `ResendSchedule` bisa dibuat, diubah statusnya, dan dihapus/dibatalkan secara terpisah dari `BatchRecipient`

---

## Fase 1 — Konfigurasi Threshold & Batas Resend

**Tujuan:** User bisa mengatur perilaku Auto-Resend, baik secara default global maupun per batch.

**Deliverable:**
- UI Settings: toggle aktif/nonaktif Auto-Resend, threshold hari, batas maksimal resend (FR3-1.1)
- Override per batch di Step 6 wizard (Atur Jadwal) — mewarisi default global jika tidak diubah (FR3-1.2)
- Auto-Resend nonaktif secara default untuk batch lama dari sebelum V3 (FR3-1.5)

**Kenapa setelah Fase 0, sebelum Fase 2:** Logika trigger di Fase 2 butuh nilai threshold & batas yang valid untuk dievaluasi — tidak ada gunanya membangun logika evaluasi sebelum ada sumber konfigurasi yang bisa dibaca.

**Definition of Done:**
- [ ] User bisa mengatur default global dan melihatnya otomatis terwarisi ke batch baru
- [ ] User bisa override nilai per batch dan overridenya tersimpan terpisah dari default global
- [ ] Batch yang sudah ada sebelum V3 dirilis terbukti tidak otomatis mengaktifkan Auto-Resend

---

## Fase 2 — Logika Trigger & Penjadwalan

**Tujuan:** Inti dari V3 — worker yang mengevaluasi kapan sebuah `BatchRecipient` layak dijadwalkan resend, dan membatalkannya jika balasan datang lebih dulu.

**Deliverable:**
- Job berkala yang mengevaluasi `BatchRecipient` berstatus `Sent`/`Applied` terhadap threshold yang berlaku (FR3-2.1)
- Logika penjadwalan resend ke `ResendSchedule` saat threshold terlampaui dan batas resend belum tercapai (FR3-2.2)
- Integrasi dengan Replies Module: pembatalan otomatis `ResendSchedule` begitu balasan terdeteksi, termasuk saat sudah masuk approval window (FR3-2.3)

**Kenapa ini fase paling berisiko di V3, sama seperti peran Replies Module di V2:** Kesalahan di sini (salah hitung threshold, gagal membatalkan saat ada balasan) berdampak langsung ke reputasi pengiriman user — beda dengan bug UI biasa yang cuma mengganggu pengalaman, bug di fase ini bisa benar-benar mengirim email yang seharusnya tidak terkirim.

**Definition of Done:**
- [ ] `BatchRecipient` yang melewati threshold dan belum dibalas terbukti masuk `ResendSchedule` secara otomatis
- [ ] Balasan yang masuk sebelum threshold tercapai terbukti mencegah `BatchRecipient` tersebut masuk penjadwalan sama sekali
- [ ] Balasan yang masuk setelah dijadwalkan (tapi sebelum approval window berakhir) terbukti membatalkan `ResendSchedule` terkait
- [ ] `BatchRecipient` yang sudah mencapai batas maksimal resend terbukti tidak dijadwalkan lagi

---

## Fase 3 — Approval Window

**Tujuan:** Memberi user jendela terakhir untuk meninjau dan membatalkan sebelum resend benar-benar dieksekusi.

**Deliverable:**
- Notifikasi (memanfaatkan Notifikasi Sederhana V2) saat resend dijadwalkan, menampilkan daftar perusahaan yang akan menerima resend (FR3-3.2)
- Aksi pembatalan individual per perusahaan, dan pembatalan massal sekaligus (FR3-3.3)
- Timer approval window (default 24 jam, dapat dikonfigurasi) yang berjalan konsisten meski user tidak membuka aplikasi (FR3-3.1, FR3-3.4)

**Kenapa setelah Fase 2, bukan digabung:** Approval window menampilkan dan mengelola item yang sudah ada di `ResendSchedule` dari Fase 2 — membangunnya lebih awal berarti bekerja dengan data dummy yang tidak representatif.

**Definition of Done:**
- [ ] Notifikasi approval window muncul tepat waktu saat resend pertama kali dijadwalkan
- [ ] User berhasil membatalkan resend individual tanpa memengaruhi item lain di jadwal yang sama
- [ ] User berhasil membatalkan seluruh jadwal resend sekaligus
- [ ] Resend yang tidak dibatalkan tetap berjalan otomatis setelah approval window berakhir tanpa perlu aksi tambahan dari user

---

## Fase 4 — Eksekusi Resend

**Tujuan:** Mengirim resend yang sudah lolos approval window, sepenuhnya terintegrasi dengan mekanisme pengiriman aman yang sudah ada sejak V1.

**Deliverable:**
- Worker eksekusi resend yang reuse template awal apa adanya (FR3-4.1)
- Resend tunduk pada delay, jam aktif, hari aktif yang berlaku (FR3-4.2)
- Resend tunduk pada Auto-Stop V1, dihitung dalam failure rate yang sama (FR3-4.3, konsisten dengan §9 Risiko PRD V3)
- Resend tercatat di Activity Log dan menambah `resend_count` (FR3-4.4)
- Resend terbukti tidak memicu Peringatan Re-apply V2 (FR3-4.5)

**Kenapa di akhir, bukan digabung dengan Fase 2/3:** Eksekusi adalah titik tanpa jalan kembali — begitu email terkirim, tidak bisa ditarik lagi. Memisahkannya jadi fase sendiri memastikan seluruh logika pembatalan (Fase 2) dan peninjauan (Fase 3) benar-benar matang dan teruji sebelum kode eksekusi nyata disentuh.

**Definition of Done:**
- [ ] Resend yang lolos approval window benar-benar terkirim menggunakan template awal tanpa modifikasi
- [ ] Resend terbukti mengikuti delay/jam aktif/hari aktif yang sama seperti pengiriman batch biasa
- [ ] Simulasi failure rate tinggi pada resend terbukti memicu Auto-Stop yang sama seperti pengiriman awal
- [ ] Wizard batch manual tetap memicu Peringatan Re-apply seperti biasa, sementara alur resend terbukti tidak memicunya

---

## Fase 5 — QA, Hardening & Beta Terbatas

**Tujuan:** Validasi menyeluruh dengan penekanan pada risiko reputasi — fase ini diberi alokasi waktu lebih panjang dibanding pola V1/V2 karena konsekuensi kesalahan di V3 lebih sulit dibatalkan (email sudah terkirim ke pihak eksternal).

**Deliverable:**
- Pengujian end-to-end seluruh rantai: konfigurasi → trigger → approval window → eksekusi, termasuk skenario pembatalan di setiap titik
- Pengujian guard rail dari sisi API langsung (bukan hanya UI), mengulang validasi Fase 0 dengan skenario lebih luas
- Beta terbatas: aktifkan Auto-Resend untuk **sebagian kecil user** V2 dengan pengawasan ketat, bukan langsung dirilis penuh ke semua user
- Pemantauan aktif selama beta: reply rate setelah resend, laporan keluhan (jika ada) dari sisi HR/penerima yang bisa ditangkap lewat feedback user
- Perbaikan bug dan penyesuaian guard rail (jika perlu) berdasarkan hasil beta, sebelum rilis penuh

**Definition of Done:**
- [ ] Checklist §8 Definition of Done V3 di PRD terpenuhi semua
- [ ] Tidak ada insiden resend yang lolos ke perusahaan yang sudah membalas selama masa beta
- [ ] Tidak ada laporan signifikan yang mengindikasikan resend dianggap spam oleh penerima selama masa beta
- [ ] Tim punya keputusan eksplisit "lanjut rilis penuh" atau "tunda & revisi" berdasarkan hasil beta — bukan otomatis lanjut hanya karena waktu pengerjaan selesai

---

## Catatan Penting

- **Tidak ada fase paralel yang berarti di V3** — beda dari V1 (Fase 2) dan V2 (Fase 2) yang punya modul independen. Kalau ada developer lebih dari satu, pertimbangkan alokasi ke penguatan testing di tiap fase (terutama Fase 2 dan 5), bukan memecah fase jadi paralel semu yang justru berisiko rework karena saling bergantung.
- **Fase 2 (Logika Trigger & Penjadwalan)** adalah titik risiko teknis tertinggi, dan **Fase 5 (Beta Terbatas)** adalah titik risiko bisnis/reputasi tertinggi — alokasikan buffer waktu ekstra di keduanya, bukan dipangkas demi mengejar jadwal.
- Rilis penuh Auto-Resend ke seluruh user **sebaiknya tidak terjadi otomatis** begitu Fase 5 selesai secara teknis — perlu keputusan sadar berdasarkan hasil beta, sesuai Definition of Done Fase 5 di atas.
