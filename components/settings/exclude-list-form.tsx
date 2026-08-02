"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"

interface ExcludeEntry {
  id: string
  pattern: string
  createdAt: string
}

export function ExcludeListForm() {
  const [entries, setEntries] = useState<ExcludeEntry[]>([])
  const [newPattern, setNewPattern] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/exclude-list")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEntries(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd() {
    if (!newPattern.trim()) return
    setError("")
    try {
      const res = await fetch("/api/exclude-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pattern: newPattern }),
      })
      if (!res.ok) throw new Error("Failed to add")
      const entry = await res.json()
      setEntries((prev) => [entry, ...prev])
      setNewPattern("")
    } catch {
      setError("Gagal menambah pola")
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/exclude-list?id=${id}`, { method: "DELETE" })
      setEntries((prev) => prev.filter((e) => e.id !== id))
    } catch {
      setError("Gagal menghapus pola")
    }
  }

  return (
    <Card variant="dark">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon name="block" size="sm" className="text-signal-orange" />
          <CardTitle>Exclude List</CardTitle>
        </div>
        <CardDescription>
          Pola pengirim/subjek yang diabaikan saat deteksi tier Indikasi.
          Misalnya &quot;noreply@&quot; atau &quot;linkedin.com&quot;.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-[3px] border border-signal-orange/30 bg-signal-orange/10 p-2.5 text-xs text-signal-orange">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Contoh: noreply@ atau berita"
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
          />
          <Button onClick={handleAdd} disabled={!newPattern.trim()} variant="primary" className="shrink-0">
            Tambah
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-7 w-28 rounded-[3px]" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <Icon name="block" size="md" className="text-warm-granite opacity-40 mx-auto" />
            <p className="text-xs text-warm-granite">Belum ada pola exclude</p>
            <p className="text-[10px] text-warm-granite/60">
              Tambah pola di atas untuk mengabaikan pengirim atau subjek tertentu
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="group flex items-center gap-1.5 rounded-[3px] border border-ash-stroke bg-carbon-lift px-2.5 py-1.5 hover:border-error-container/40 transition-colors"
              >
                <span className="text-xs text-bone font-mono">{entry.pattern}</span>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-warm-granite/50 group-hover:text-error transition-colors"
                >
                  <Icon name="close" size="sm" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
