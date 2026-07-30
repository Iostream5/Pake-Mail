"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Icon } from "@/components/ui/icon"

interface Template {
  id: string
  name: string
  subject: string
  body: string
  closing: string | null
  isFavorite: boolean
  createdAt: string
  sentCount?: number
  replyCount?: number
  replyRate?: number | null
}

interface VariableHint {
  var: string
  desc: string
  source: "profile" | "recipient"
}

const VARIABLE_HINTS: VariableHint[] = [
  { var: "{{full_name}}", desc: "Nama lengkap kamu", source: "profile" },
  { var: "{{phone}}", desc: "Nomor telepon kamu", source: "profile" },
  { var: "{{email}}", desc: "Alamat email kamu", source: "profile" },
  { var: "{{linkedin}}", desc: "Link LinkedIn kamu", source: "profile" },
  { var: "{{portfolio}}", desc: "Link portfolio kamu", source: "profile" },
  { var: "{{company}}", desc: "Nama perusahaan tujuan (data perusahaan)", source: "recipient" },
  { var: "{{position}}", desc: "Posisi yang dilamar (data perusahaan)", source: "recipient" },
]

const emptyForm = { name: "", subject: "", body: "", closing: "" }

interface Profile {
  fullName?: string
  phone?: string | null
  email?: string | null
  linkedinUrl?: string | null
  portfolioUrl?: string | null
  links?: { name: string; url: string }[]
}

export function TemplateList() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<Template | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const res = await fetch("/api/templates")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setTemplates(data)
    } catch {
      setError("Gagal memuat template")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => { if (d && typeof d === "object") setProfile(d) })
      .catch(() => {})
  }, [])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.body) return
    setSaving(true)
    setError("")
    try {
      const method = editingId ? "PUT" : "POST"
      const body = editingId ? { id: editingId, ...form } : form
      const res = await fetch("/api/templates", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Failed to save")
      resetForm()
      await fetchTemplates()
    } catch {
      setError("Gagal menyimpan template")
    } finally {
      setSaving(false)
    }
  }

  const handleClone = async (id: string) => {
    try {
      setError("")
      const res = await fetch("/api/templates/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error("Failed to clone")
      await fetchTemplates()
    } catch {
      setError("Gagal meng-clone template")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setError("")
      const res = await fetch(`/api/templates?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setDeleteTarget(null)
      await fetchTemplates()
    } catch {
      setError("Gagal menghapus template")
    }
  }

  const handleToggleFavorite = async (t: Template) => {
    try {
      setError("")
      const res = await fetch("/api/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, isFavorite: !t.isFavorite }),
      })
      if (!res.ok) throw new Error("Failed to update")
      await fetchTemplates()
    } catch {
      setError("Gagal mengupdate template")
    }
  }

  const startEdit = (t: Template) => {
    setForm({ name: t.name, subject: t.subject, body: t.body, closing: t.closing || "" })
    setEditingId(t.id)
    setShowForm(true)
  }

  const openPreview = (t: Template) => {
    setPreviewData(t)
    setShowPreview(true)
  }

  const [showVariables, setShowVariables] = useState(false)
  const [activeField, setActiveField] = useState<string>("body")

  const insertVariable = (v: string) => {
    setForm((p) => ({ ...p, [activeField]: p[activeField as keyof typeof p] + v }))
  }

  const findLink = (name: string): string | null => {
    if (!profile?.links) return null
    const found = profile.links.find((l) => l.name.toLowerCase() === name.toLowerCase())
    return found?.url || null
  }

  const renderPreview = (text: string) => {
    const fb = (label: string) => `[${label} — belum diisi]`
    return text
      .replace(/\{\{full_name\}\}/g, profile?.fullName || fb("Nama"))
      .replace(/\{\{phone\}\}/g, profile?.phone || fb("No. Telepon"))
      .replace(/\{\{email\}\}/g, profile?.email || fb("Email"))
      .replace(/\{\{linkedin\}\}/g, findLink("linkedin") || profile?.linkedinUrl || fb("LinkedIn"))
      .replace(/\{\{portfolio\}\}/g, findLink("portfolio") || profile?.portfolioUrl || fb("Portfolio"))
      .replace(/\{\{company\}\}/g, "PT Maju Jaya")
      .replace(/\{\{position\}\}/g, "Frontend Developer")
  }

  const favorites = templates.filter((t) => t.isFavorite)
  const others = templates.filter((t) => !t.isFavorite)

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} variant="dark">
            <CardContent className="p-4">
              <div className="h-4 w-2/3 animate-pulse rounded bg-carbon-lift" />
              <div className="mt-2 h-3 w-full animate-pulse rounded bg-carbon-lift" />
              <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-carbon-lift" />
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
        <h1 className="text-2xl font-bold text-bone">Template Email</h1>
        <Button onClick={() => { resetForm(); setShowForm(true) }}>
          <Icon name="add" size="sm" />
          Buat Template
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Form Create/Edit */}
      <Dialog
        open={showForm}
        onClose={resetForm}
        title={editingId ? "Edit Template" : "Buat Template Baru"}
        description="Isi template email yang akan dikirim ke perusahaan."
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <Input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            onFocus={() => setActiveField("name")}
            placeholder="Nama Template — Mis: Lamaran Frontend Developer"
          />

          <Input
            value={form.subject}
            onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
            onFocus={() => setActiveField("subject")}
            placeholder="Subject Email — Lamaran {{position}} - {{full_name}}"
          />

          <Textarea
            value={form.body}
            onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
            onFocus={() => setActiveField("body")}
            rows={8}
            placeholder="Body Email"
          />

          <Textarea
            value={form.closing}
            onChange={(e) => setForm((p) => ({ ...p, closing: e.target.value }))}
            onFocus={() => setActiveField("closing")}
            rows={2}
            placeholder="Penutup Signature — Hormat saya,&#10;{{full_name}}"
          />

          {/* Info notice — always visible */}
          <div className="flex items-start gap-2 rounded bg-metric-green/10 border border-metric-green/20 px-3 py-2">
            <Icon name="info" size="sm" className="text-metric-green shrink-0 mt-0.5" />
            <div className="text-[11px] text-metric-green/90 leading-relaxed">
              <p><strong>Jangan diedit manual.</strong> Variable seperti <code className="text-[10px] font-mono bg-black/20 px-1 rounded">{`{{full_name}}`}</code> akan diganti otomatis oleh sistem dengan data profil kamu. Cukup klik variable untuk menyisipkannya, lalu biarkan apa adanya.</p>
              <p className="mt-1">Variable yang ditampilkan hanya yang sudah kamu isi di halaman Profil. Untuk menambah variable lain, isi dulu datanya di Profil.</p>
            </div>
          </div>

          {/* Collapsible Variable Reference */}
          <div className="rounded-lg border border-ash-stroke overflow-hidden">
            <button
              onClick={() => setShowVariables(!showVariables)}
              className="flex items-center justify-between w-full px-4 py-2.5 bg-carbon-lift hover:bg-obsidian-canvas transition-colors"
            >
              <div className="flex items-center gap-2">
                <Icon name="code" size="sm" className="text-metric-green" />
                <span className="text-xs font-medium text-bone">Variable yang tersedia</span>
              </div>
              <Icon
                name="expand_more"
                size="sm"
                className={`text-warm-granite transition-transform ${showVariables ? "rotate-180" : ""}`}
              />
            </button>
            {showVariables && (
              <div className="px-4 py-3 space-y-3 border-t border-ash-stroke">
                <p className="text-[11px] text-warm-granite/60">
                  Klik variable untuk menyisipkan ke kolom yang sedang aktif.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {VARIABLE_HINTS.filter((v) => {
                    if (v.source === "recipient") return true
                    if (v.var === "{{full_name}}") return !!profile?.fullName
                    if (v.var === "{{phone}}") return !!profile?.phone
                    if (v.var === "{{email}}") return !!profile?.email
                    if (v.var === "{{linkedin}}") return !!(findLink("linkedin") || profile?.linkedinUrl)
                    if (v.var === "{{portfolio}}") return !!(findLink("portfolio") || profile?.portfolioUrl)
                    return false
                  }).map((v) => (
                    <button
                      key={v.var}
                      onClick={() => insertVariable(v.var)}
                      className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-obsidian-canvas transition-colors group"
                    >
                      <code className="text-[11px] font-mono text-metric-green group-hover:text-bone transition-colors shrink-0">
                        {v.var}
                      </code>
                      <span className="text-[11px] text-warm-granite group-hover:text-bone/70 transition-colors truncate">
                        {v.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-ash-stroke">
            <Button variant="ghost" onClick={resetForm}>Batal</Button>
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={!form.name || !form.subject || !form.body}
            >
              {editingId ? "Update" : "Simpan"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="Preview Template"
        description="Pratinjau email dengan data profil kamu:"
        className="max-w-2xl"
      >
        {previewData && (
          <div className="space-y-0 rounded-lg border border-ash-stroke overflow-hidden bg-carbon-lift">
            <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 px-4 py-3 bg-carbon-lift border-b border-ash-stroke text-xs text-warm-granite">
              <span className="font-medium">Dari:</span>
              <span>{profile?.fullName || "Nama"} &lt;{profile?.email || "email@example.com"}&gt;</span>
              <span className="font-medium">Subjek:</span>
              <span className="text-bone font-medium">{renderPreview(previewData.subject)}</span>
            </div>
            <div className="px-4 py-4 whitespace-pre-wrap text-sm text-bone leading-relaxed">
              {renderPreview(previewData.body)}
            </div>
            {previewData.closing && (
              <div className="px-4 py-3 border-t border-ash-stroke whitespace-pre-wrap text-sm text-bone/80">
                {renderPreview(previewData.closing)}
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Template"
        description={`Yakin ingin menghapus template "${deleteTarget?.name}"? Tindakan ini tidak bisa dibatalkan.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Batal
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
          >
            Hapus
          </Button>
        </div>
      </Dialog>

      {/* Favorites Section */}
      {favorites.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Icon name="star" size="sm" className="text-yellow-500" />
            <h2 className="text-sm font-semibold text-warm-granite uppercase tracking-wide">Favorit</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {favorites.map((t) => renderTemplateCard(t))}
          </div>
        </div>
      )}

      {/* All Templates */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Icon name="description" size="sm" className="text-warm-granite" />
          <h2 className="text-sm font-semibold text-warm-granite uppercase tracking-wide">
            {favorites.length > 0 ? "Semua Template" : "Template"}
          </h2>
        </div>
        {templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ash-stroke p-16 text-center space-y-3">
            <Icon name="mail_outline" size="xl" className="text-warm-granite opacity-60 mx-auto" />
            <p className="text-sm text-warm-granite">Belum ada template email.</p>
            <p className="text-xs text-warm-granite/60 max-w-md mx-auto">
              Template adalah kerangka email yang akan dikirim ke perusahaan. 
              Kamu bisa membuat template lamaran kerja dengan data yang terisi otomatis.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => { resetForm(); setShowForm(true) }}
            >
              <Icon name="add" size="sm" />
              Buat Template Pertama
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {others.map((t) => renderTemplateCard(t))}
          </div>
        )}
      </div>
    </div>
  )

  function renderTemplateCard(t: Template) {
    const hasStats = t.sentCount !== undefined && t.sentCount > 0

    return (
      <Card key={t.id} variant="dark">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-bone truncate">{t.name}</p>
                {t.isFavorite && (
                  <Icon name="star" size="sm" className="text-yellow-500 shrink-0" filled />
                )}
              </div>
              <p className="text-xs text-warm-granite truncate mt-0.5">{t.subject}</p>
            </div>
            {hasStats && (
              <div className="shrink-0 text-right">
                <p className="text-xs font-medium text-metric-green">
                  {t.replyRate !== null && t.replyRate !== undefined
                    ? `${t.replyRate.toFixed(0)}%`
                    : <span className="text-warm-granite">-</span>
                  }
                </p>
                <p className="text-[10px] text-warm-granite">
                  {t.replyCount}/{t.sentCount} balas
                </p>
                {t.replyRate === null && (
                  <p className="text-[8px] text-warm-granite/60">data belum cukup</p>
                )}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-warm-granite line-clamp-2 leading-relaxed">
            {t.body}
          </p>
          {t.closing && (
            <p className="mt-1 text-xs text-warm-granite/60 line-clamp-1 italic">{t.closing}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-1">
            <Button variant="ghost" size="sm" onClick={() => startEdit(t)}>
              <Icon name="edit" size="sm" />
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openPreview(t)}>
              <Icon name="visibility" size="sm" />
              Preview
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleClone(t.id)}>
              <Icon name="content_copy" size="sm" />
              Clone
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={t.isFavorite ? "text-yellow-500" : "text-warm-granite"}
              onClick={() => handleToggleFavorite(t)}
              title={t.isFavorite ? "Hapus dari favorit" : "Tandai sebagai favorit"}
            >
              <Icon name="star" size="sm" filled={t.isFavorite} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-warm-granite hover:text-red-400"
              onClick={() => setDeleteTarget(t)}
            >
              <Icon name="delete" size="sm" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
}
