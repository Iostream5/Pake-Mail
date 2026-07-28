"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"

interface Document {
  id: string
  name: string
  category: string
  fileUrl: string
  fileSizeKb: number
  version: number
  createdAt: string
}

const CATEGORIES = [
  { value: "ALL", label: "Semua" },
  { value: "CV", label: "CV" },
  { value: "PORTFOLIO", label: "Portfolio" },
  { value: "IJAZAH", label: "Ijazah" },
  { value: "SKCK", label: "SKCK" },
  { value: "TRANSKRIP", label: "Transkrip" },
  { value: "OTHER", label: "Lainnya" },
]

const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c.value !== "ALL").map((c) => ({
  value: c.value,
  label: c.label,
}))

export function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeCategory, setActiveCategory] = useState("ALL")
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

  const filtered = activeCategory === "ALL" ? documents : documents.filter((d) => d.category === activeCategory)

  function formatSize(kb: number) {
    if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
    return `${kb} KB`
  }

  function getCategoryBadge(category: string) {
    const map: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
      CV: "info",
      PORTFOLIO: "success",
      IJAZAH: "warning",
      SKCK: "danger",
      TRANSKRIP: "default",
      OTHER: "default",
    }
    return map[category] || "default"
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
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
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-1 border-b border-zinc-200 pb-1 dark:border-zinc-800">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`rounded-t-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat.value
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        </div>
        <Button size="sm" onClick={() => setShowUpload(true)}>
          Upload Dokumen
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Document Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">
            {activeCategory === "ALL"
              ? "Belum ada dokumen. Upload dokumen pertama kamu."
              : "Tidak ada dokumen di kategori ini."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
                      {doc.name[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-blue-600"
                      onClick={() => setPreviewDoc(doc)}
                      title="Preview"
                    >
                      👁
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-amber-600"
                      onClick={() => { setReplaceDoc(doc); setReplaceFile(null) }}
                      title="Ganti file"
                    >
                      🔄
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-red-600"
                      onClick={() => handleDelete(doc.id)}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={getCategoryBadge(doc.category)}>
                      {doc.category}
                    </Badge>
                    <span className="text-xs text-zinc-400">{formatSize(doc.fileSizeKb)}</span>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-zinc-400">
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
            className="block w-full text-sm text-zinc-500 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-300"
          />
          {replaceFile && (
            <p className="text-xs text-zinc-400">{replaceFile.name} ({(replaceFile.size / 1024).toFixed(0)} KB)</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setReplaceDoc(null); setReplaceFile(null) }}>
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
        description={`Kategori: ${previewDoc?.category ?? "-"}`}
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
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">File</label>
            <input
              type="file"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              accept=".pdf,.docx,.jpg,.png"
              className="mt-1.5 block w-full text-sm text-zinc-500 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-300"
            />
            {uploadFile && (
              <p className="mt-1 text-xs text-zinc-400">{uploadFile.name} ({(uploadFile.size / 1024).toFixed(0)} KB)</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowUpload(false)
                setUploadName("")
                setUploadFile(null)
              }}
            >
              Batal
            </Button>
            <Button onClick={handleUpload} loading={uploading} disabled={!uploadFile}>
              Upload
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
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

  if (loading) return <div className="text-sm text-zinc-500">Loading preview...</div>
  if (error) return <div className="text-sm text-red-500">{error}</div>

  return (
    <div className="w-full h-[70vh]">
      <iframe
        src={url}
        className="w-full h-full rounded border border-zinc-200 dark:border-zinc-800"
        title="Document preview"
      />
    </div>
  )
}