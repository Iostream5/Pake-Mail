"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "sonner"

interface EmailAccount {
  id: string
  provider: string
  email: string
  isDefault: boolean
  dailyLimit: number
  connectedAt: string
}

export function EmailAccountsList() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [connecting, setConnecting] = useState(false)

  // Confirm Disconnect
  const [disconnectTargetId, setDisconnectTargetId] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const res = await fetch("/api/email-accounts")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setAccounts(data)
    } catch {
      setError("Gagal memuat akun email")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleConnectGmail = () => {
    setConnecting(true)
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const redirectUri = `${window.location.origin}/api/email-accounts/callback`
    const scope = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.modify"
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`

    const popup = window.open(authUrl, "google-oauth", "width=600,height=700")
    if (!popup) {
      setConnecting(false)
      return
    }

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "oauth-success") {
        window.removeEventListener("message", handleMessage)
        setError("")
        fetchAccounts()
        setConnecting(false)
        toast.success("Akun Gmail berhasil dihubungkan!")
      } else if (e.data?.type === "oauth-error") {
        window.removeEventListener("message", handleMessage)
        setError("Gagal menghubungkan akun Gmail")
        setConnecting(false)
        toast.error("Gagal menghubungkan akun Gmail")
      }
    }

    window.addEventListener("message", handleMessage)

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed)
        window.removeEventListener("message", handleMessage)
        setConnecting(false)
      }
    }, 1000)
  }

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch("/api/email-accounts/default", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error("Failed to set default")
      await fetchAccounts()
      toast.success("Akun email default diperbarui!")
    } catch {
      setError("Gagal mengatur akun default")
      toast.error("Gagal mengatur akun default")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/email-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Gagal memutus koneksi")
      }
      await fetchAccounts()
      toast.success("Koneksi email berhasil diputus!")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memutus koneksi")
      toast.error(e instanceof Error ? e.message : "Gagal memutus koneksi")
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="flex-1">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="mt-1 h-3 w-1/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Akun Email</h1>
        <Button onClick={handleConnectGmail} loading={connecting}>
          {connecting ? "Menghubungkan..." : "Hubungkan Gmail"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Info box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
        <p className="font-medium">Penting</p>
        <p className="mt-1">
          Batch lamaran membutuhkan minimal 1 akun email yang terhubung. 
          Gmail gratis memiliki batas ±500 email/hari. Gunakan Google Workspace untuk volume lebih besar.
        </p>
      </div>

      {/* Confirm Disconnect Dialog */}
      <ConfirmDialog
        open={disconnectTargetId !== null}
        onClose={() => setDisconnectTargetId(null)}
        onConfirm={async () => {
          if (disconnectTargetId) await handleDelete(disconnectTargetId)
        }}
        title="PUTUSKAN KONEKSI EMAIL"
        description="Apakah Anda yakin ingin memutuskan koneksi akun email ini? Anda tidak akan bisa menggunakannya lagi untuk batch lamaran kecuali dihubungkan kembali."
      />

      {/* Account List */}
      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">
            Belum ada akun email terhubung. Klik "Hubungkan Gmail" untuk memulai.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {account.provider[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{account.email}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-zinc-500">{account.provider}</span>
                        {account.isDefault && (
                          <Badge variant="info">Default</Badge>
                        )}
                        <span className="text-xs text-zinc-400">
                          Limit: ~{account.dailyLimit}/hari
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!account.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(account.id)}
                      >
                        Jadikan Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDisconnectTargetId(account.id)}
                    >
                      Putuskan
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}