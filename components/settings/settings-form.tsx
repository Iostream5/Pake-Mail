"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface Settings {
  id?: string
  resendEnabledDefault: boolean
  resendThresholdDaysDefault: number
  resendMaxCountDefault: number
  resendApprovalWindowHours: number
  reapplyWindowDays: number
}

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((res) => {
        if (res && res.id) setSettings(res)
      })
      .catch(() => {})
  }, [])

  if (!settings) {
    return (
      <Card variant="dark">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        </CardContent>
      </Card>
    )
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to save")
      setSettings(json)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card variant="dark">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon name="repeat" size="sm" className="text-metric-green" />
            <CardTitle>Auto-Resend</CardTitle>
          </div>
          <CardDescription>
            Kirim ulang lamaran otomatis ke perusahaan yang belum membalas setelah
            threshold waktu tertentu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              className={cn(
                "h-5 w-9 rounded-full transition-colors relative",
                settings.resendEnabledDefault ? "bg-metric-green" : "bg-ash-stroke"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-bone transition-all",
                  settings.resendEnabledDefault ? "left-[18px]" : "left-0.5"
                )}
              />
              <input
                type="checkbox"
                checked={settings.resendEnabledDefault}
                onChange={(e) =>
                  setSettings({ ...settings, resendEnabledDefault: e.target.checked })
                }
                className="hidden"
              />
            </div>
            <span className="text-xs font-mono uppercase tracking-widest text-bone group-hover:text-bone/80 transition-colors">
              Aktifkan Auto-Resend (default)
            </span>
          </label>

          <Input
            label="Threshold (hari)"
            type="number"
            min={3}
            value={settings.resendThresholdDaysDefault}
            onChange={(e) =>
              setSettings({
                ...settings,
                resendThresholdDaysDefault: Number(e.target.value),
              })
            }
            helperText="Minimal 3 hari sejak email pertama terkirim."
          />

          <Input
            label="Maksimal Resend"
            type="number"
            min={1}
            max={3}
            value={settings.resendMaxCountDefault}
            onChange={(e) =>
              setSettings({
                ...settings,
                resendMaxCountDefault: Number(e.target.value),
              })
            }
            helperText="Maksimal 3 kali resend per perusahaan."
          />

          <Input
            label="Approval Window (jam)"
            type="number"
            min={1}
            value={settings.resendApprovalWindowHours}
            onChange={(e) =>
              setSettings({
                ...settings,
                resendApprovalWindowHours: Number(e.target.value),
              })
            }
            helperText="Jeda waktu sebelum resend benar-benar terkirim."
          />
        </CardContent>
      </Card>

      <Card variant="dark">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon name="warning" size="sm" className="text-signal-orange" />
            <CardTitle>Re-apply Warning</CardTitle>
          </div>
          <CardDescription>
            Peringatan saat user melamar ke perusahaan yang sudah pernah dilamar dalam periode tertentu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Input
            label="Periode peringatan (hari)"
            type="number"
            min={1}
            value={settings.reapplyWindowDays}
            onChange={(e) =>
              setSettings({ ...settings, reapplyWindowDays: Number(e.target.value) })
            }
            helperText="Default 30 hari. Peringatan muncul jika perusahaan dilamar dalam rentang ini dan belum ada balasan."
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} loading={saving} variant="primary">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 rounded-[3px] bg-metric-green/15 px-2.5 py-1 text-[10px] font-mono text-metric-green">
            <Icon name="check" size="sm" /> Saved
          </span>
        )}
        {error && (
          <span className="flex items-center gap-1 rounded-[3px] bg-signal-orange/15 px-2.5 py-1 text-[10px] font-mono text-signal-orange">
            <Icon name="error" size="sm" /> {error}
          </span>
        )}
      </div>
    </div>
  )
}
