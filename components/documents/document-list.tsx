"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Icon } from "@/components/ui/icon"

interface Document {
  id: string
  name: string
  category: string
  fileUrl: string
  fileSizeKb: number
  version: number
  createdAt: string
}

const CATEGORY_LABELS: Record<string, string> = {
  CV: "CV",
  SURAT_LAMARAN: "Surat Lamaran",
  IJAZAH: "Ijazah",
  SKCK: "SKCK",
  TRANSKRIP: "Transkrip",
  SERTIFIKAT: "Sertifikat",
  PAS_FOTO: "Pas Foto",
  OTHER: "Lainnya",
}

const CATEGORY_LIMITS: Record<string, number> = {
  SURAT_LAMARAN: 2,
  CV: 3,
  IJAZAH: 1,
  SKCK: 1,
  TRANSKRIP: 1,
  SERTIFIKAT: 7,
  PAS_FOTO: 2,
  OTHER: 5,
}

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadName, setUploadName] = useState("")
  const [uploadCategory, setUploadCategory] = useState("CV")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [replaceDoc, setReplaceDoc] = useState<Document | null>(null)
  const [replaceFile, setReplaceFile] = useState<File | null>(null)
  const [replacing, setReplacing] = useState(false)

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const res = await fetch("/api/documents")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setDocuments(data)
    } catch {
      setError("Gagal memuat dokumen")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const categoryCounts = documents.reduce<Record<string, number>>((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + 1
    return acc
  }, {})

  const q = search.toLowerCase()
  const filtered = search
    ? documents.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          (CATEGORY_LABELS[d.category] || "").toLowerCase().includes(q)
      )
    : documents

  const handleUpload = async () => {
    if (!uploadFile) return
    setUploading(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("file", uploadFile)
      formData.append("name", uploadName || uploadFile.name.replace(/\.[^/.]+$/, ""))
      formData.append("category", uploadCategory)
      const res = await fetch("/api/documents/upload", { method: "POST", body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Upload gagal")
      }
      setShowUpload(false)
      setUploadName("")
      setUploadFile(null)
      setUploadCategory("CV")
      await fetchDocuments()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload gagal")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Hapus gagal")
      }
      await fetchDocuments()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hapus gagal")
    }
  }

  function formatSize(kb: number) {
    if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
    return `${kb} KB`
  }

  function getCategoryBadge(category: string) {
    const map: Record<string, "default" | "success" | "warning" | "danger" | "info" | "orange"> = {
      CV: "info",
      SURAT_LAMARAN: "success",
      IJAZAH: "warning",
      SKCK: "danger",
      TRANSKRIP: "default",
      SERTIFIKAT: "orange",
      PAS_FOTO: "default",
      OTHER: "default",
    }
    return map[category] || "default"
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} variant="dark">
            <CardContent className="p-4">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-carbon-lift" />
              <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-carbon-lift" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-carbon-lift" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon name="search" size="sm" className="text-warm-granite" />
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari dokumen..."
            className="pl-10"
          />
        </div>
        <Button size="sm" onClick={() => setShowUpload(true)}>
          <Icon name="add" size="sm" />
          Upload Dokumen
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Document Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ash-stroke p-12 text-center">
          <p className="text-sm text-warm-granite">
            {search
              ? "Tidak ada dokumen yang cocok dengan pencarian."
              : "Belum ada dokumen. Upload dokumen pertama kamu."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <Card key={doc.id} variant="dark">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-carbon-lift">
                    <span className="text-sm font-bold text-warm-granite">
                      {doc.name[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-warm-granite hover:text-bone"
                      onClick={() => setPreviewDoc(doc)}
                      title="Preview"
                    >
                      <Icon name="visibility" size="sm" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-warm-granite hover:text-signal-orange"
                      onClick={() => { setReplaceDoc(doc); setReplaceFile(null) }}
                      title="Ganti file"
                    >
                      <Icon name="autorenew" size="sm" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-warm-granite hover:text-red-400"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Icon name="delete" size="sm" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-sm font-medium text-bone truncate">{doc.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={getCategoryBadge(doc.category)}>
                      {CATEGORY_LABELS[doc.category] || doc.category}
                    </Badge>
                    <span className="text-xs text-warm-granite">{formatSize(doc.fileSizeKb)}</span>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-warm-granite">
                  v{doc.version} · {new Date(doc.createdAt).toLocaleDateString("id-ID")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Replace Dialog */}
      <Dialog
        open={replaceDoc !== null}
        onClose={() => { setReplaceDoc(null); setReplaceFile(null) }}
        title={`Ganti File: ${replaceDoc?.name ?? ""}`}
        description={`Versi saat ini: v${replaceDoc?.version ?? 0}. Pilih file baru untuk menggantikan.`}
      >
        <div className="space-y-4">
          <input
            type="file"
            onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
            accept=".pdf,.docx,.jpg,.png"
            className="block w-full text-sm text-warm-granite file:mr-4 file:rounded-lg file:border-0 file:bg-carbon-lift file:px-4 file:py-2 file:text-sm file:font-medium file:text-bone hover:file:bg-carbon-lift/80"
          />
          {replaceFile && (
            <p className="text-xs text-warm-granite">{replaceFile.name} ({(replaceFile.size / 1024).toFixed(0)} KB)</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setReplaceDoc(null); setReplaceFile(null) }}>
              Batal
            </Button>
            <Button
              onClick={async () => {
                if (!replaceDoc || !replaceFile) return
                setReplacing(true)
                try {
                  const fd = new FormData()
                  fd.append("id", replaceDoc.id)
                  fd.append("file", replaceFile)
                  const res = await fetch("/api/documents", { method: "PUT", body: fd })
                  if (!res.ok) throw new Error("Gagal mengganti file")
                  setReplaceDoc(null)
                  setReplaceFile(null)
                  await fetchDocuments()
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Gagal mengganti file")
                } finally {
                  setReplacing(false)
                }
              }}
              loading={replacing}
              disabled={!replaceFile}
            >
              Ganti
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDoc !== null}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.name ?? "Preview"}
        description={`Kategori: ${previewDoc ? (CATEGORY_LABELS[previewDoc.category] || previewDoc.category) : "-"}`}
        className="max-w-4xl"
      >
        {previewDoc && (
          <PreviewContent docId={previewDoc.id} />
        )}
      </Dialog>

      {/* Upload Dialog */}
      <Dialog
        open={showUpload}
        onClose={() => {
          setShowUpload(false)
          setUploadName("")
          setUploadFile(null)
          setUploadCategory("CV")
        }}
        title="Upload Dokumen"
        description="Pilih file dan atur kategori dokumen."
      >
        <div className="space-y-4">
          <Input
            label="Nama Dokumen"
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            placeholder="Kosongkan untuk pakai nama file"
          />
          <Select
            label="Kategori"
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            options={CATEGORY_OPTIONS}
          />
          <div className="flex items-center gap-2 text-xs text-warm-granite">
            <span>Kapasitas:</span>
            <span className={getCapacityClass(uploadCategory, categoryCounts[uploadCategory] || 0)}>
              {(categoryCounts[uploadCategory] || 0)}/{CATEGORY_LIMITS[uploadCategory]}
            </span>
            <span>terpakai</span>
          </div>
          <div>
            <label className="text-sm font-medium text-bone">File</label>
            <input
              type="file"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              accept=".pdf,.docx,.jpg,.png"
              className="mt-1.5 block w-full text-sm text-warm-granite file:mr-4 file:rounded-lg file:border-0 file:bg-carbon-lift file:px-4 file:py-2 file:text-sm file:font-medium file:text-bone hover:file:bg-carbon-lift/80"
            />
            {uploadFile && (
              <p className="mt-1 text-xs text-warm-granite">{uploadFile.name} ({(uploadFile.size / 1024).toFixed(0)} KB)</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowUpload(false)
                setUploadName("")
                setUploadFile(null)
              }}
            >
              Batal
            </Button>
            <Button
              onClick={handleUpload}
              loading={uploading}
              disabled={!uploadFile || (categoryCounts[uploadCategory] || 0) >= CATEGORY_LIMITS[uploadCategory]}
            >
              Upload
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

function getCapacityClass(category: string, count: number) {
  const limit = CATEGORY_LIMITS[category]
  if (!limit) return "text-warm-granite"
  if (count >= limit) return "text-red-400 font-medium"
  if (count >= limit - 1) return "text-signal-orange font-medium"
  return "text-metric-green"
}

function PreviewContent({ docId }: { docId: string }) {
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/documents/preview?id=${docId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.data?.url) setUrl(data.data.url)
        else setError("Preview tidak tersedia")
      })
      .catch(() => setError("Gagal memuat preview"))
      .finally(() => setLoading(false))
  }, [docId])

  if (loading) return <div className="text-sm text-warm-granite">Loading preview...</div>
  if (error) return <div className="text-sm text-red-400">{error}</div>

  return (
    <div className="w-full h-[70vh]">
      <iframe
        src={url}
        className="w-full h-full rounded border border-ash-stroke"
        title="Document preview"
      />
    </div>
  )
}
