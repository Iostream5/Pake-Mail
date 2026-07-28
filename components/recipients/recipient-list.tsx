"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog } from "@/components/ui/dialog"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@/components/ui/icon"
import { MonoLabel } from "@/components/ui/mono-label"

interface Recipient {
  id: string
  companyName: string
  hrEmail: string
  position: string | null
  location: string | null
  website: string | null
  source: string | null
  notes: string | null
  tags: string | null
  createdAt: string
}

const emptyForm = { companyName: "", hrEmail: "", position: "", location: "", tags: "" }

export function RecipientList() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [historyRecipient, setHistoryRecipient] = useState<Recipient | null>(null)
  const [historyData, setHistoryData] = useState<any[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchRecipients = useCallback(async (q: string) => {
    try {
      setLoading(true)
      setError("")
      const params = q ? `?search=${encodeURIComponent(q)}` : ""
      const res = await fetch(`/api/recipients${params}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setRecipients(data)
    } catch {
      setError("Gagal memuat data perusahaan")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecipients(search)
  }, [fetchRecipients, search])

  const handleSearch = (value: string) => {
    setSearch(value)
  }

  const handleAdd = async () => {
    if (!form.companyName || !form.hrEmail) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Gagal menambah")
      }
      setShowAdd(false)
      setForm(emptyForm)
      await fetchRecipients(search)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambah")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setError("")
      const res = await fetch(`/api/recipients?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      await fetchRecipients(search)
    } catch {
      setError("Gagal menghapus")
    }
  }

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setError("")
    try {
      const text = await file.text()
      const lines = text.split("\n").filter(Boolean)
      if (lines.length < 2) throw new Error("CSV harus memiliki header + minimal 1 baris data")
      const header = lines[0].split(",").map((h) => h.trim().replace(/^"+|"+$/g, ""))
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(",").map((v) => v.trim().replace(/^"+|"+$/g, ""))
        const row: Record<string, string> = {}
        header.forEach((h, i) => { row[h] = vals[i] || "" })
        return row
      })
      const res = await fetch("/api/recipients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, onDuplicate: "skip" }),
      })
      if (!res.ok) throw new Error("Import gagal")
      await fetchRecipients(search)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import gagal")
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const handleExport = () => {
    window.open("/api/recipients/export", "_blank")
  }

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end border-b border-ash-stroke pb-4">
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportCsv}
            disabled={importing}
          />
          <Button
            variant="ghost"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            <Icon name="upload" className="mr-2 text-sm" />
            IMPORT CSV
          </Button>
          <Button variant="ghost" onClick={handleExport}>
            <Icon name="download" className="mr-2 text-sm" />
            EXPORT CSV
          </Button>
          <Button variant="primary" onClick={() => setShowAdd(true)}>
            <Icon name="add" className="mr-2 text-sm" />
            TAMBAH MANUAL
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-error bg-error-container p-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Icon name="search" className="text-graphite-mid text-sm" />
        </div>
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Cari nama perusahaan atau email..."
          className="pl-10 bg-obsidian-canvas border-ash-stroke text-bone focus:border-bone font-mono"
        />
      </div>

      {/* Add Dialog */}
      <Dialog
        open={showAdd}
        onClose={() => { setShowAdd(false); setForm(emptyForm) }}
        title="TAMBAH PERUSAHAAN"
        description="Isi data perusahaan tujuan lamaran."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <MonoLabel>Nama Perusahaan</MonoLabel>
            <Input
              value={form.companyName}
              onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
              placeholder="PT Maju Jaya"
              className="bg-obsidian-canvas border-ash-stroke text-bone focus:border-bone"
            />
          </div>
          <div className="space-y-2">
            <MonoLabel>Email HR</MonoLabel>
            <Input
              type="email"
              value={form.hrEmail}
              onChange={(e) => setForm((p) => ({ ...p, hrEmail: e.target.value }))}
              placeholder="hr@majujaya.com"
              className="bg-obsidian-canvas border-ash-stroke text-bone focus:border-bone"
            />
          </div>
          <div className="space-y-2">
            <MonoLabel>Posisi yang Dilamar</MonoLabel>
            <Input
              value={form.position}
              onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
              placeholder="Frontend Developer"
              className="bg-obsidian-canvas border-ash-stroke text-bone focus:border-bone"
            />
          </div>
          <div className="space-y-2">
            <MonoLabel>Lokasi</MonoLabel>
            <Input
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              placeholder="Jakarta"
              className="bg-obsidian-canvas border-ash-stroke text-bone focus:border-bone"
            />
          </div>
          <div className="space-y-2">
            <MonoLabel>Tags (pisahkan dengan koma)</MonoLabel>
            <Input
              value={form.tags}
              onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              placeholder="frontend, react, startup"
              className="bg-obsidian-canvas border-ash-stroke text-bone focus:border-bone"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-ash-stroke">
            <Button variant="ghost" onClick={() => { setShowAdd(false); setForm(emptyForm) }}>
              BATAL
            </Button>
            <Button
              variant="primary"
              onClick={handleAdd}
              disabled={!form.companyName || !form.hrEmail || saving}
            >
              {saving ? "MENYIMPAN..." : "SIMPAN"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        open={historyRecipient !== null}
        onClose={() => { setHistoryRecipient(null); setHistoryData(null) }}
        title={`RIWAYAT LAMARAN`}
        description={historyRecipient ? `${historyRecipient.companyName} (${historyRecipient.hrEmail})` : ""}
        className="max-w-2xl"
      >
        {historyLoading ? (
          <div className="py-8 text-center text-sm font-mono text-warm-granite">MEMUAT...</div>
        ) : historyData && historyData.length > 0 ? (
          <div className="space-y-3">
            {historyData.map((h: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded border border-ash-stroke bg-obsidian-canvas p-3">
                <div className="space-y-1">
                  <Link
                    href={`/dashboard/batches/${h.batchId}`}
                    className="text-sm font-mono text-bone hover:underline"
                  >
                    {h.batchName}
                  </Link>
                  <div className="flex items-center gap-2 text-[11px] text-warm-granite font-mono">
                    <span>Status: {h.status}</span>
                    {h.sentAt && <span>· {new Date(h.sentAt).toLocaleDateString("id-ID")}</span>}
                  </div>
                </div>
                <Badge variant={h.batchStatus === "RUNNING" ? "orange" : "default"}>
                  {h.batchStatus}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm font-mono text-warm-granite">
            BELUM ADA RIWAYAT LAMARAN UNTUK PERUSAHAAN INI.
          </div>
        )}
      </Dialog>

      {/* Table - Desktop */}
      <div className="hidden rounded border border-ash-stroke bg-carbon-lift sm:block">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-ash-stroke hover:bg-transparent">
              <TableHead className="font-mono text-warm-granite text-xs uppercase tracking-wider">Perusahaan</TableHead>
              <TableHead className="font-mono text-warm-granite text-xs uppercase tracking-wider">Email HR</TableHead>
              <TableHead className="font-mono text-warm-granite text-xs uppercase tracking-wider">Posisi</TableHead>
              <TableHead className="font-mono text-warm-granite text-xs uppercase tracking-wider">Lokasi</TableHead>
              <TableHead className="font-mono text-warm-granite text-xs uppercase tracking-wider">Tags</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && recipients.length === 0 ? (
              <TableRow className="border-b-0 hover:bg-transparent">
                <TableCell colSpan={6} className="py-12 text-center">
                  <span className="font-mono text-warm-granite text-sm uppercase tracking-widest">MEMUAT DATA...</span>
                </TableCell>
              </TableRow>
            ) : recipients.length === 0 ? (
              <TableRow className="border-b-0 hover:bg-transparent">
                <TableCell colSpan={6} className="py-12 text-center">
                  <span className="font-mono text-warm-granite text-sm">
                    {search
                      ? "TIDAK ADA HASIL PENCARIAN."
                      : "BELUM ADA DATA. TAMBAH MANUAL ATAU IMPORT CSV."}
                  </span>
                </TableCell>
              </TableRow>
            ) : (
              recipients.map((r) => (
                <TableRow key={r.id} className="border-b border-ash-stroke hover:bg-obsidian-canvas/50 transition-colors">
                  <TableCell className="font-medium text-bone font-mono text-sm">{r.companyName}</TableCell>
                  <TableCell className="text-warm-granite font-mono text-sm">{r.hrEmail}</TableCell>
                  <TableCell className="text-warm-granite text-sm">{r.position || "-"}</TableCell>
                  <TableCell className="text-warm-granite text-sm">{r.location || "-"}</TableCell>
                  <TableCell>
                    {r.tags ? (
                      <div className="flex flex-wrap gap-1">
                        {r.tags.split(",").map((tag) => (
                          <Badge key={tag} variant="bone">
                            {tag.trim()}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-graphite-mid">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setHistoryRecipient(r)
                          setHistoryLoading(true)
                          setHistoryData(null)
                          fetch(`/api/recipients/history?recipientId=${r.id}`)
                            .then((res) => res.json())
                            .then((data) => setHistoryData(data.data?.history ?? []))
                            .catch(() => setHistoryData([]))
                            .finally(() => setHistoryLoading(false))
                        }}
                        className="h-8 px-2 text-warm-granite hover:text-bone"
                        title="Riwayat lamaran"
                      >
                        <Icon name="history" className="text-sm" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleDelete(r.id)}
                        className="h-8 px-2 text-error hover:text-error hover:bg-error-container"
                      >
                        <Icon name="delete" className="text-sm" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Cards - Mobile */}
      <div className="space-y-3 sm:hidden">
        {loading && recipients.length === 0 ? (
          <div className="py-8 text-center text-sm font-mono text-warm-granite uppercase tracking-widest">MEMUAT DATA...</div>
        ) : recipients.length === 0 ? (
          <div className="rounded border border-dashed border-ash-stroke p-8 text-center text-sm font-mono text-warm-granite">
            {search
              ? "TIDAK ADA HASIL PENCARIAN."
              : "BELUM ADA DATA. TAMBAH MANUAL ATAU IMPORT CSV."}
          </div>
        ) : (
          recipients.map((r) => (
            <div
              key={r.id}
              className="rounded border border-ash-stroke bg-carbon-lift p-4"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-mono text-bone font-medium">{r.companyName}</p>
                  <p className="mt-1 text-xs font-mono text-warm-granite">{r.hrEmail}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    className="shrink-0 h-8 px-2 text-warm-granite hover:text-bone"
                    onClick={() => {
                      setHistoryRecipient(r)
                      setHistoryLoading(true)
                      setHistoryData(null)
                      fetch(`/api/recipients/history?recipientId=${r.id}`)
                        .then((res) => res.json())
                        .then((data) => setHistoryData(data.data?.history ?? []))
                        .catch(() => setHistoryData([]))
                        .finally(() => setHistoryLoading(false))
                    }}
                    title="Riwayat lamaran"
                  >
                    <Icon name="history" className="text-sm" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="shrink-0 h-8 px-2 text-error hover:text-error hover:bg-error-container"
                    onClick={() => handleDelete(r.id)}
                  >
                    <Icon name="delete" className="text-sm" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-warm-granite font-mono">
                {r.position && <span>POS: {r.position}</span>}
                {r.location && <span>LOC: {r.location}</span>}
              </div>
              {r.tags && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {r.tags.split(",").map((tag) => (
                    <Badge key={tag} variant="bone">
                      {tag.trim()}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}