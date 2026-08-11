export type ErrorCategoryName = "temporary" | "permanent" | "quota" | "unknown" | "auth" | "attachment"

interface ErrorCategory {
  friendlyMessage: string
  category: ErrorCategoryName
  suggestedAction?: string
}

const ERROR_PATTERNS: Array<{ pattern: RegExp; category: ErrorCategory }> = [
  {
    pattern: /invalid_grant|invalid_client|(?:token|credential).*(?:expired|invalid|revoked|disabled)/i,
    category: {
      friendlyMessage: "Token akses akun email kadaluarsa atau tidak valid, sambungkan ulang akun",
      category: "auth",
      suggestedAction: "Putuskan dan sambungkan ulang akun email di Pengaturan",
    },
  },
  {
    pattern: /auth(?:entication)?.*(?:fail|required|error)|insufficient.*permission|access.*denied/i,
    category: {
      friendlyMessage: "Kesalahan autentikasi akun email, sambungkan ulang akun",
      category: "auth",
      suggestedAction: "Putuskan dan sambungkan ulang akun email di Pengaturan",
    },
  },
  {
    pattern: /(?:attachment|file).*(?:too large|exceeds.*limit)|exceeds.*25.?mb|message.*too big/i,
    category: {
      friendlyMessage: "Ukuran pesan melebihi batas Gmail (25MB), lampiran terlalu besar",
      category: "attachment",
      suggestedAction: "Perkecil atau hapus lampiran sebelum mengirim",
    },
  },
  {
    pattern: /550.*(?:mailbox|user|address|account).*(?:not found|does not exist|invalid|unknown)/i,
    category: {
      friendlyMessage: "Alamat email tidak valid atau tidak ditemukan",
      category: "permanent",
      suggestedAction: "Perbarui alamat email di Recipient Management",
    },
  },
  {
    pattern: /550.*(?:5\.1\.1|5\.1\.0)/i,
    category: {
      friendlyMessage: "Alamat email tidak valid atau tidak ditemukan",
      category: "permanent",
      suggestedAction: "Perbarui alamat email di Recipient Management",
    },
  },
  {
    pattern: /550.*(?:spam|blocked|rejected|banned)/i,
    category: {
      friendlyMessage: "Email ditolak server penerima (kemungkinan terdeteksi spam)",
      category: "permanent",
    },
  },
  {
    pattern: /(?:421|450).*(?:timeout|greylisting|try again|temporary)/i,
    category: {
      friendlyMessage: "Server penerima menolak sementara, sedang dicoba ulang otomatis",
      category: "temporary",
    },
  },
  {
    pattern: /(?:421|450)/i,
    category: {
      friendlyMessage: "Server penerima menolak sementara, sedang dicoba ulang otomatis",
      category: "temporary",
    },
  },
  {
    pattern: /554.*(?:quota|limit|exceeded|full)/i,
    category: {
      friendlyMessage: "Kotak masuk penerima penuh (quota exceeded)",
      category: "permanent",
    },
  },
  {
    pattern: /(?:quota|limit).*(?:exceeded|reached|full)/i,
    category: {
      friendlyMessage: "Limit pengiriman harian akun email tercapai",
      category: "quota",
      suggestedAction: "Tunggu hingga batas harian ter-reset, atau gunakan akun email lain",
    },
  },
  {
    pattern: /(?:dailyLimit|rate limit|429)/i,
    category: {
      friendlyMessage: "Terlalu banyak permintaan, silakan coba lagi nanti",
      category: "temporary",
    },
  },
  {
    pattern: /552.*(?:storage|space|quota)/i,
    category: {
      friendlyMessage: "Kotak masuk penerima penuh",
      category: "permanent",
    },
  },
  {
    pattern: /55[13579]/i,
    category: {
      friendlyMessage: "Alamat email ditolak server tujuan",
      category: "permanent",
      suggestedAction: "Periksa kembali alamat email di Recipient Management",
    },
  },
  {
    pattern: /4[0-9][0-9].*(?:retry|try again|temporary)/i,
    category: {
      friendlyMessage: "Gangguan sementara di server penerima, sistem akan mencoba ulang",
      category: "temporary",
    },
  },
  {
    pattern: /(?:dns|mx).*(?:not found|resolution|lookup)/i,
    category: {
      friendlyMessage: "Domain email tujuan tidak ditemukan",
      category: "permanent",
      suggestedAction: "Periksa alamat email, mungkin ada kesalahan domain",
    },
  },
  {
    pattern: /connection.*(?:refused|timed out|reset)/i,
    category: {
      friendlyMessage: "Gagal terhubung ke server email tujuan",
      category: "temporary",
    },
  },
  {
    pattern: /certificate|tls|ssl/i,
    category: {
      friendlyMessage: "Kesalahan keamanan koneksi ke server tujuan",
      category: "temporary",
    },
  },
]

export function isRetryable(category: ErrorCategoryName): boolean {
  return category === "temporary" || category === "unknown"
}

export function categorizeError(rawError: string): ErrorCategory {
  for (const { pattern, category } of ERROR_PATTERNS) {
    if (pattern.test(rawError)) {
      return category
    }
  }

  return {
    friendlyMessage: "Gagal mengirim email karena kesalahan yang tidak dikenal",
    category: "unknown",
  }
}
