"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"

interface EmailAccount {
  id: string
  provider: string
  email: string
  isDefault: boolean
  dailyLimit: number
  connectedAt: string
}

function getInitials(email: string) {
  return email[0].toUpperCase()
}

export function EmailAccountsList() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [connecting, setConnecting] = useState(false)

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
      } else if (e.data?.type === "oauth-error") {
        window.removeEventListener("message", handleMessage)
        setError("Gagal menghubungkan akun Gmail")
        setConnecting(false)
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
    } catch {
      setError("Gagal mengatur akun default")
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memutus koneksi")
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-geist-sans)] text-2xl text-bone font-medium tracking-tight">
          Akun Email
        </h1>
        <p className="text-sm text-warm-granite mt-0.5">
          {accounts.length > 0
            ? `${accounts.length} akun ${accounts.length > 1 ? "terhubung" : "terhubung"}`
            : "Hubungkan akun Gmail untuk mengirim lamaran"}
        </p>
      </div>

      {error && (
        <div className="rounded-[3px] border border-signal-orange/30 bg-signal-orange/10 p-3 text-xs text-signal-orange">
          {error}
        </div>
      )}

      {/* Info box */}
      <Card variant="dark" className="border-signal-orange/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Icon name="info" size="sm" className="text-signal-orange mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-bone">Penting</p>
            <p className="text-[11px] text-warm-granite mt-0.5 leading-relaxed">
              Batch lamaran membutuhkan minimal 1 akun email yang terhubung.
              Gmail gratis memiliki batas ±500 email/hari. Gunakan Google Workspace untuk volume lebih besar.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Connect button */}
      <div className="flex justify-end">
        <Button onClick={handleConnectGmail} loading={connecting}>
          <Icon name="add" size="sm" />
          {connecting ? "Menghubungkan..." : "Hubungkan Gmail"}
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} variant="dark">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-28 rounded-[3px]" />
                  <Skeleton className="h-8 w-20 rounded-[3px]" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && accounts.length === 0 && (
        <Card variant="dark">
          <CardContent className="py-12 text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-full bg-carbon-lift flex items-center justify-center border border-ash-stroke">
                <Icon name="mail" size="lg" className="text-warm-granite" />
              </div>
            </div>
            <div>
              <p className="text-sm text-bone font-medium">Belum ada akun terhubung</p>
              <p className="text-xs text-warm-granite mt-1 max-w-xs mx-auto">
                Hubungkan akun Gmail untuk mulai mengirim lamaran secara otomatis
              </p>
            </div>
            <Button onClick={handleConnectGmail} loading={connecting}>
              <Icon name="add" size="sm" />
              Hubungkan Gmail
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Account list */}
      {!loading && accounts.length > 0 && (
        <div className="space-y-2.5">
          {accounts.map((account) => (
            <Card key={account.id} variant="dark" className="hover:border-bone/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-metric-green/15 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-metric-green">
                        {getInitials(account.email)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-bone">{account.email}</p>
                        {account.isDefault && (
                          <Badge variant="info">Default</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-warm-granite">{account.provider}</span>
                        <span className="text-warm-granite/50">•</span>
                        <span className="text-xs text-warm-granite">
                          Limit ~{account.dailyLimit}/hari
                        </span>
                        <span className="text-warm-granite/50">•</span>
                        <span className="text-[10px] text-warm-granite/60">
                          {formatDate(account.connectedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!account.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(account.id)}
                      >
                        Jadikan Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-signal-orange hover:text-signal-orange hover:bg-signal-orange/10"
                      onClick={() => handleDelete(account.id)}
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
