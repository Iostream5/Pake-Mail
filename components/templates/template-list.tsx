"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog } from "@/components/ui/dialog"

interface Template {
  id: string
  name: string
  subject: string
  body: string
  closing: string | null
  isFavorite: boolean
  createdAt: string
}

const VARIABLE_HINTS = [
  { var: "{{full_name}}", desc: "Nama lengkap dari profil" },
  { var: "{{phone}}", desc: "Nomor telepon" },
  { var: "{{email}}", desc: "Email" },
  { var: "{{linkedin}}", desc: "LinkedIn URL" },
  { var: "{{portfolio}}", desc: "Portfolio URL" },
  { var: "{{company}}", desc: "Nama perusahaan tujuan" },
  { var: "{{position}}", desc: "Posisi yang dilamar" },
]

const emptyForm = { name: "", subject: "", body: "", closing: "" }

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

  const insertVariable = (v: string) => {
    setForm((p) => ({ ...p, body: p.body + v }))
  }

  const insertVariableSubject = (v: string) => {
    setForm((p) => ({ ...p, subject: p.subject + v }))
  }

  const renderPreview = (text: string) => {
    return text
      .replace(/\{\{full_name\}\}/g, "John Doe")
      .replace(/\{\{phone\}\}/g, "0812-3456-7890")
      .replace(/\{\{email\}\}/g, "john@example.com")
      .replace(/\{\{linkedin\}\}/g, "linkedin.com/in/johndoe")
      .replace(/\{\{portfolio\}\}/g, "johndoe.dev")
      .replace(/\{\{company\}\}/g, "PT Maju Jaya")
      .replace(/\{\{position\}\}/g, "Frontend Developer")
  }

  const favorites = templates.filter((t) => t.isFavorite)
  const others = templates.filter((t) => !t.isFavorite)

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-2 h-3 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
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
        <h1 className="text-2xl font-bold">Template Email</h1>
        <Button onClick={() => { resetForm(); setShowForm(true) }}>
          Buat Template
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Form Create/Edit */}
      <Dialog
        open={showForm}
        onClose={resetForm}
        title={editingId ? "Edit Template" : "Buat Template Baru"}
        description="Gunakan variable yang tersedia untuk personalisasi email."
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <Input
            label="Nama Template"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Mis: Lamaran Frontend"
          />
          <div>
            <Input
              label="Subject Email"
              value={form.subject}
              onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              placeholder="Lamaran {{position}} - {{full_name}}"
            />
            <div className="mt-1 flex flex-wrap gap-1">
              {VARIABLE_HINTS.map((v) => (
                <button
                  key={v.var}
                  onClick={() => insertVariableSubject(v.var)}
                  className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                  title={v.desc}
                >
                  {v.var}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Textarea
              label="Body Email"
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              rows={8}
              placeholder="Tulis body email di sini... Gunakan variable seperti {{company}}"
              className="font-mono"
            />
            <div className="mt-1 flex flex-wrap gap-1">
              {VARIABLE_HINTS.map((v) => (
                <button
                  key={v.var}
                  onClick={() => insertVariable(v.var)}
                  className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                  title={v.desc}
                >
                  {v.var}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            label="Penutup (Signature)"
            value={form.closing}
            onChange={(e) => setForm((p) => ({ ...p, closing: e.target.value }))}
            rows={2}
            placeholder="Hormat saya,&#10;{{full_name}}"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>Batal</Button>
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
        description="Contoh render dengan data dummy:"
        className="max-w-2xl"
      >
        {previewData && (
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-medium text-zinc-500">Subject:</p>
              <p className="text-sm font-medium">{renderPreview(previewData.subject)}</p>
            </div>
            <div className="whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
              {renderPreview(previewData.body)}
            </div>
            {previewData.closing && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs font-medium text-zinc-500">Penutup:</p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{renderPreview(previewData.closing)}</p>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Favorites Section */}
      {favorites.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-500 uppercase tracking-wide">Favorit</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {favorites.map((t) => renderTemplateCard(t))}
          </div>
        </div>
      )}

      {/* All Templates */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-500 uppercase tracking-wide">Semua Template</h2>
        {others.length === 0 && favorites.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-500">Belum ada template. Klik "Buat Template" untuk memulai.</p>
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
    return (
      <Card key={t.id}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{t.name}</p>
                {t.isFavorite && <span className="text-yellow-500 text-sm">★</span>}
              </div>
              <p className="text-xs text-zinc-500 truncate mt-0.5">{t.subject}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-400 line-clamp-2 font-mono">{t.body}</p>
          {t.closing && (
            <p className="mt-1 text-xs text-zinc-400 line-clamp-1">{t.closing}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-1">
            <Button variant="ghost" size="sm" onClick={() => startEdit(t)}>Edit</Button>
            <Button variant="ghost" size="sm" onClick={() => openPreview(t)}>Preview</Button>
            <Button variant="ghost" size="sm" onClick={() => handleClone(t.id)}>Clone</Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-yellow-600 hover:text-yellow-700"
              onClick={() => handleToggleFavorite(t)}
            >
              {t.isFavorite ? "★" : "☆"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={() => handleDelete(t.id)}
            >
              Hapus
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
}