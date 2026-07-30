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
  const [deleteConfirm, setDeleteConfirm] = useState<Recipient | null>(null)
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
      setDeleteConfirm(null)
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
      {/* Header with summary and actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-ash-stroke pb-4">
        <div>
          <h2 className="font-mono text-sm font-medium text-bone">
            Daftar Perusahaan Tujuan
          </h2>
          {!loading && (
            <p className="mt-1 text-xs font-mono text-warm-granite">
              {recipients.length} perusahaan terdaftar
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportCsv}
            disabled={importing}
          />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="text-xs"
            >
              <Icon name="upload" className="mr-1.5 text-sm" />
              {importing ? "MENGIMPORT..." : "IMPORT CSV"}
            </Button>
            <Button variant="ghost" onClick={handleExport} className="text-xs">
              <Icon name="download" className="mr-1.5 text-sm" />
              EXPORT CSV
            </Button>
            <Button variant="primary" onClick={() => setShowAdd(true)} className="text-xs">
              <Icon name="add" className="mr-1.5 text-sm" />
              TAMBAH MANUAL
            </Button>
          </div>
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
          placeholder="Cari nama perusahaan atau email HR..."
          className="pl-10 bg-obsidian-canvas border-ash-stroke text-bone focus:border-bone font-mono"
        />
      </div>

      {/* Add Dialog */}
      <Dialog
        open={showAdd}
        onClose={() => { setShowAdd(false); setForm(emptyForm) }}
        title="Tambah Perusahaan Baru"
        description="Lengkapi data perusahaan yang akan menjadi tujuan lamaran."
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <MonoLabel>Nama Perusahaan <span className="text-error">*</span></MonoLabel>
              <Input
                value={form.companyName}
                onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                placeholder="contoh: PT Maju Jaya"
                className="bg-obsidian-canvas border-ash-stroke text-bone focus:border-bone"
              />
            </div>
            <div className="space-y-2">
              <MonoLabel>Email HR <span className="text-error">*</span></MonoLabel>
              <Input
                type="email"
                value={form.hrEmail}
                onChange={(e) => setForm((p) => ({ ...p, hrEmail: e.target.value }))}
                placeholder="contoh: hr@majujaya.com"
                className="bg-obsidian-canvas border-ash-stroke text-bone focus:border-bone"
              />
            </div>
            <div className="space-y-2">
              <MonoLabel>Posisi yang Dilamar</MonoLabel>
              <Input
                value={form.position}
                onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                placeholder="contoh: Frontend Developer"
                className="bg-obsidian-canvas border-ash-stroke text-bone focus:border-bone"
              />
            </div>
            <div className="space-y-2">
              <MonoLabel>Lokasi Perusahaan</MonoLabel>
              <Input
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="contoh: Jakarta"
                className="bg-obsidian-canvas border-ash-stroke text-bone focus:border-bone"
              />
            </div>
          </div>
          <div className="space-y-2">
            <MonoLabel>Tags (pisahkan dengan koma)</MonoLabel>
            <Input
              value={form.tags}
              onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              placeholder="contoh: frontend, react, startup"
              className="bg-obsidian-canvas border-ash-stroke text-bone focus:border-bone"
            />
            <p className="text-[11px] text-warm-granite font-mono">Gunakan tag untuk mengelompokkan perusahaan, misalnya berdasarkan teknologi atau prioritas.</p>
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
        title="Riwayat Lamaran"
        description={historyRecipient ? `Lamaran yang pernah dikirim ke ${historyRecipient.companyName}` : ""}
        className="max-w-2xl"
      >
        {historyLoading ? (
          <div className="py-8 text-center text-sm font-mono text-warm-granite">Memuat riwayat...</div>
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
          <div className="flex flex-col items-center py-10 text-center">
            <Icon name="history" className="text-2xl text-graphite-mid mb-3" />
            <p className="text-sm font-mono text-warm-granite">
              Belum ada riwayat lamaran untuk perusahaan ini.
            </p>
          </div>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Hapus Perusahaan"
        description={`Apakah Anda yakin ingin menghapus ${deleteConfirm?.companyName}? Data yang sudah dihapus tidak dapat dikembalikan.`}
      >
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
            BATAL
          </Button>
          <Button
            variant="primary"
            onClick={() => deleteConfirm && handleDelete(deleteConfirm.id)}
            className="bg-error text-white hover:bg-error/80"
          >
            HAPUS
          </Button>
        </div>
      </Dialog>

      {/* Empty State */}
      {!loading && recipients.length === 0 && !search && (
        <div className="flex flex-col items-center rounded border border-dashed border-ash-stroke bg-carbon-lift py-14 px-6 text-center">
          <Icon name="business" className="text-3xl text-graphite-mid mb-4" />
          <h3 className="font-mono text-sm font-medium text-bone mb-1">Belum Ada Data Perusahaan</h3>
          <p className="text-xs font-mono text-warm-granite max-w-sm">
            Tambah perusahaan tujuan lamaran secara manual atau import dari file CSV untuk memulai.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Button variant="primary" onClick={() => setShowAdd(true)} className="text-xs">
              <Icon name="add" className="mr-1.5 text-sm" />
              TAMBAH MANUAL
            </Button>
            <span className="text-xs text-warm-granite font-mono">atau</span>
            <Button
              variant="ghost"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="text-xs"
            >
              <Icon name="upload" className="mr-1.5 text-sm" />
              IMPORT CSV
            </Button>
          </div>
        </div>
      )}

      {/* Table - Desktop */}
      {!(loading && recipients.length === 0) && !(!loading && recipients.length === 0 && !search) && (
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
                        ? "Tidak ada hasil untuk pencarian ini."
                        : "Belum ada data perusahaan."}
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
                          title="Lihat riwayat lamaran"
                        >
                          <Icon name="history" className="text-sm" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setDeleteConfirm(r)}
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
      )}

      {/* Cards - Mobile */}
      {!(loading && recipients.length === 0) && !(!loading && recipients.length === 0 && !search) && (
        <div className="space-y-3 sm:hidden">
          {loading && recipients.length === 0 ? (
            <div className="py-8 text-center text-sm font-mono text-warm-granite uppercase tracking-widest">MEMUAT DATA...</div>
          ) : recipients.length === 0 ? (
            <div className="rounded border border-dashed border-ash-stroke p-8 text-center text-sm font-mono text-warm-granite">
              {search
                ? "Tidak ada hasil untuk pencarian ini."
                : "Belum ada data perusahaan."}
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
                      title="Lihat riwayat lamaran"
                    >
                      <Icon name="history" className="text-sm" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="shrink-0 h-8 px-2 text-error hover:text-error hover:bg-error-container"
                      onClick={() => setDeleteConfirm(r)}
                    >
                      <Icon name="delete" className="text-sm" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-warm-granite font-mono">
                  {r.position && <span>Posisi: {r.position}</span>}
                  {r.location && <span>Lokasi: {r.location}</span>}
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
      )}
    </div>
  )
}