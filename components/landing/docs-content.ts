import type { DocContent } from "@/components/landing/doc-modal"

export const FOOTER_DOCS: Record<string, DocContent> = {
  documentation: {
    id: "documentation",
    badge: "RESOURCES",
    title: "Dokumentasi Sistem",
    updated: "03 AUG 2026",
    intro:
      "PAKE MAIL adalah sistem manajemen pengiriman lamaran kerja massal (batch) via email. Dokumentasi ini menjelaskan alur kerja inti dari 7-Langkah Workflow Wizard hingga keamanan pengiriman.",
    sections: [
      {
        heading: "Arsitektur Alur Kerja",
        body:
          "PAKE MAIL mengorkestrasikan seluruh aset data job seeker — akun email, template, dokumen, dan daftar perusahaan — menjadi satu kampanye lamaran terstruktur. Semua proses berjalan melalui 7 tahap yang saling terkait, dari konfigurasi identitas batch sampai peluncuran pengiriman.",
        list: [
          "Konfigurasi Identitas Batch — beri nama & deskripsi unik pada tiap kampanye.",
          "Hubungkan Akun Email — autentikasi Gmail via OAuth untuk akses aman.",
          "Pilih & Sesuaikan Template — pilih template surat lamaran dan petakan variabel.",
          "Unggah Dokumen Lamaran — lampirkan CV, portofolio, dan sertifikat.",
          "Daftar Perusahaan Penerima — import daftar target via CSV/Excel.",
          "Penjadwal Cerdas — atur delay antar-pengiriman untuk menghindari flag spam.",
          "Tinjau & Luncurkan — preview ringkasan lalu mulai batch secara keseluruhan.",
        ],
      },
      {
        heading: "Alur Operasi",
        body:
          "Setiap batch diproses melalui engine antrean (queue engine) yang membaca baris perusahaan satu per satu, menginjeksi variabel {{company}} dan {{position}}, lalu mengirimkan email berurutan. Status setiap lamaran diperbarui otomatis dari 'Pending' hingga 'Interview'.",
      },
      {
        heading: "Limit & Rekomendasi",
        body:
          "Untuk menjaga reputasi pengirim, sistem menyarankan delay antar-pengiriman 30–120 detik dan menyediakan batas harian. Ini mengurangi risiko email masuk ke folder spam atau diblokir penyedia layanan.",
        list: [
          "Jaga jumlah kiriman per hari wajar agar akun tidak terindikasi spam.",
          "Gunakan variabel personalisasi ({{company}}, {{position}}) agar email tidak terlihat massal.",
          "Aktifkan jam pengiriman agar email tiba saat HR sedang aktif.",
        ],
      },
    ],
  },
  security: {
    id: "security",
    badge: "RESOURCES",
    title: "Keamanan & Privasi Data",
    updated: "03 AUG 2026",
    intro:
      "Keamanan adalah fondasi PAKE MAIL. Data kredensial dan dokumen lamaran diproses dengan standar enkripsi industri dan akses berbasis izin, bukan kata sandi mentah.",
    sections: [
      {
        heading: "Enkripsi & Proteksi",
        body:
          "Seluruh koneksi antara browser dan server dienkripsi (TLS). Akses akun email memakai Gmail OAuth 2.0 sehingga sistem tidak pernah menyimpan kata sandi Gmail Anda, melainkan token dengan scope terbatas (mengirim email saja) yang dapat dicabut kapan pun.",
      },
      {
        heading: "Autentikasi Pengguna",
        body:
          "Setiap pengguna diidentifikasi melalui sesi autentikasi yang aman. Akun premium/dokumen disegregasi per-user, sehingga satu pengguna tidak dapat mengakses batch atau dokumen pengguna lain.",
        list: [
          "Token sesi dengan masa berlaku dan rotasi.",
          "Multi-akun OAuth terpisah antara segmen personal dan profesional.",
          "Data per-batch terisolasi antar-pengguna (tenant isolation).",
        ],
      },
      {
        heading: "Praktik Terbaik Pengguna",
        body:
          "Keamanan juga bergantung pada kebiasaan Anda. Jaga kerahasiaan kredensial akun, gunakan kata sandi kuat, dan batasi akses perangkat pihak ketiga.",
        list: [
          "Gunakan email khusus untuk lamaran agar mengurangi risiko jika terindikasi spam.",
          "Cabut izin OAuth pada akun Google yang tidak lagi digunakan.",
          "Laporkan aktivitas mencurigakan pada tim dukungan segera.",
        ],
      },
    ],
  },
  terms: {
    id: "terms",
    badge: "LEGAL",
    title: "Syarat & Ketentuan",
    updated: "03 AUG 2026",
    intro:
      "Dengan menggunakan PAKE MAIL, Anda menyetujui syarat-syarat berikut. Harap baca secara menyeluruh karena syarat ini mengatur penggunaan layanan kami.",
    sections: [
      {
        heading: "Penerimaan Syarat",
        body:
          "Dengan mengakses atau menggunakan layanan PAKE MAIL, Anda menyatakan telah membaca, memahami, dan menerima seluruh syarat yang tertera. Jika tidak menyetujui sebagian atau seluruh syarat, Anda harus menyetop penggunaan layanan.",
      },
      {
        heading: "Penggunaan yang Diizinkan",
        body:
          "Layanan dirancang untuk membantu job seeker mengirim lamaran secara tertib dan efisien. Anda bertanggung jawab memastikan setiap pengiriman memenuhi kebijakan penyedia email serta tidak melanggar hak atau regulasi pihak ketiga.",
        list: [
          "Mengirim lamaran hanya untuk informasi & pekerjaan yang Anda yakini valid.",
          "Tidak menyalahgunakan layanan untuk iklan, penipuan, phising, atau spam masif.",
          "Tidak merekam/memproses data perusahaan yang melanggar peraturan yang berlaku.",
        ],
      },
      {
        heading: "Batasan Tanggung Jawab",
        body:
          "Layanan disediakan 'sebagaimana adanya'. PAKE MAIL tidak bertanggung jawab atas keterlambatan, kegagalan pengiriman akibat izin penyedia email, atau keputusan HR yang berbeda. Anda tetap memegang kendali atas konten & jadwal pengiriman Anda sendiri.",
      },
      {
        heading: "Perubahan Layanan",
        body:
          "Kami dapat menambah, mengubah, atau menghentikan fitur dengan pemberitahuan yang wajar. Dengan terus menggunakan layanan, Anda dianggap menyetujui perubahan yang diumumkan pada halaman ini.",
      },
    ],
  },
  privacy: {
    id: "privacy",
    badge: "LEGAL",
    title: "Kebijakan Privasi",
    updated: "03 AUG 2026",
    intro:
      "Kebijakan ini menjelaskan bagaimana PAKE MAIL mengumpulkan, menggunakan, dan melindungi data yang Anda berikan saat menggunakan layanan.",
    sections: [
      {
        heading: "Data yang Kami Kelola",
        body:
          "Kami mengelola data terbatas yang diperlukan untuk menjalankan layanan pembuatan & pengiriman lamaran. Data tersebut mencakup informasi akun Anda, konfigurasi batch, isi template, dokumen lamaran, dan daftar perusahaan penerima yang Anda unggah sendiri.",
      },
      {
        heading: "Bagaimana Kami Menggunakan Data",
        body:
          "Data digunakan semata-mata untuk memproses, mengatur, dan mengirim kampanye lamaran sesuai perintah Anda. Kami tidak menjual data Anda kepada pihak ketiga.",
        list: [
          "Memproses template & variabel untuk personalisasi email.",
          "Menjalankan engine antrian & penjadwal pengiriman.",
          "Menyimpan dokumen agar dapat dipakai ulang pada batch berikutnya.",
        ],
      },
      {
        heading: "Penyimpanan & Keamanan",
        body:
          "Data disimpan di infrastruktur cloud yang dienkripsi saat transit maupun saat istirahat. Akses internal dibatasi kewenangan minimum dan dapat diaudit.",
      },
      {
        heading: "Hak Anda",
        body:
          "Anda dapat meminta salinan data Anda, memperbarui, memindahkan, dan menghapus data beserta dokumen kapan pun. Penghapusan akun akan menghapus data kampanye Anda dari sistem operasional kami.",
      },
      {
        heading: "Kontak",
        body:
          "Untuk pertanyaan terkait privasi atau keamanan data, hubungi kami melalui email resmi yang tertera pada footer.",
      },
    ],
  },
}