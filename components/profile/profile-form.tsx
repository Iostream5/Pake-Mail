"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "sonner"

interface Education {
  id: string
  institution: string
  degree: string | null
  major: string | null
  startYear: number | null
  endYear: number | null
}

interface Experience {
  id: string
  company: string
  position: string
  startDate: string | null
  endDate: string | null
  description: string | null
}

interface Profile {
  id?: string
  fullName?: string
  phone?: string | null
  email?: string | null
  linkedinUrl?: string | null
  portfolioUrl?: string | null
  address?: string | null
  birthDate?: string | null
  educations?: Education[]
  experiences?: Experience[]
}

function emptyProfile(): Profile {
  return {
    fullName: "",
    phone: null,
    email: null,
    linkedinUrl: null,
    portfolioUrl: null,
    address: null,
    birthDate: null,
    educations: [],
    experiences: [],
  }
}

export function ProfileForm() {
  const [profile, setProfile] = useState<Profile>(emptyProfile())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Confirm Delete Targets
  const [deleteEduId, setDeleteEduId] = useState<string | null>(null)
  const [deleteExpId, setDeleteExpId] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/profile")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setProfile({ ...emptyProfile(), ...data })
    } catch {
      setError("Gagal memuat profil")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfile((prev) => ({ ...prev, [name]: value || null }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profile.fullName,
          phone: profile.phone,
          email: profile.email,
          linkedinUrl: profile.linkedinUrl,
          portfolioUrl: profile.portfolioUrl,
          address: profile.address,
        }),
      })
      if (!res.ok) throw new Error("Failed to save")
      setSuccess("Profil berhasil disimpan")
      toast.success("Informasi pribadi berhasil disimpan!")
      await fetchProfile()
    } catch {
      setError("Gagal menyimpan profil")
      toast.error("Gagal menyimpan profil")
    } finally {
      setSaving(false)
    }
  }

  // Education CRUD
  const [editingEdu, setEditingEdu] = useState<Partial<Education> | null>(null)
  const [showEduForm, setShowEduForm] = useState(false)

  const handleAddEducation = async () => {
    if (!editingEdu?.institution) return
    try {
      setError("")
      const res = await fetch("/api/profile/education", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEdu),
      })
      if (!res.ok) throw new Error("Failed to add")
      setShowEduForm(false)
      setEditingEdu(null)
      await fetchProfile()
      toast.success("Data pendidikan berhasil ditambahkan!")
    } catch {
      setError("Gagal menambah pendidikan")
      toast.error("Gagal menambah pendidikan")
    }
  }

  const handleUpdateEducation = async () => {
    if (!editingEdu?.id || !editingEdu?.institution) return
    try {
      setError("")
      const res = await fetch("/api/profile/education", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEdu),
      })
      if (!res.ok) throw new Error("Failed to update")
      setShowEduForm(false)
      setEditingEdu(null)
      await fetchProfile()
      toast.success("Data pendidikan berhasil diperbarui!")
    } catch {
      setError("Gagal mengupdate pendidikan")
      toast.error("Gagal mengupdate pendidikan")
    }
  }

  const handleDeleteEducation = async (id: string) => {
    try {
      setError("")
      const res = await fetch(`/api/profile/education?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      await fetchProfile()
      toast.success("Data pendidikan berhasil dihapus!")
    } catch {
      setError("Gagal menghapus pendidikan")
      toast.error("Gagal menghapus pendidikan")
    }
  }

  // Experience CRUD
  const [editingExp, setEditingExp] = useState<Partial<Experience> | null>(null)
  const [showExpForm, setShowExpForm] = useState(false)

  const handleAddExperience = async () => {
    if (!editingExp?.company || !editingExp?.position) return
    try {
      setError("")
      const res = await fetch("/api/profile/experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingExp),
      })
      if (!res.ok) throw new Error("Failed to add")
      setShowExpForm(false)
      setEditingExp(null)
      await fetchProfile()
      toast.success("Pengalaman kerja berhasil ditambahkan!")
    } catch {
      setError("Gagal menambah pengalaman")
      toast.error("Gagal menambah pengalaman")
    }
  }

  const handleUpdateExperience = async () => {
    if (!editingExp?.id || !editingExp?.company || !editingExp?.position) return
    try {
      setError("")
      const res = await fetch("/api/profile/experience", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingExp),
      })
      if (!res.ok) throw new Error("Failed to update")
      setShowExpForm(false)
      setEditingExp(null)
      await fetchProfile()
      toast.success("Pengalaman kerja berhasil diperbarui!")
    } catch {
      setError("Gagal mengupdate pengalaman")
      toast.error("Gagal mengupdate pengalaman")
    }
  }

  const handleDeleteExperience = async (id: string) => {
    try {
      setError("")
      const res = await fetch(`/api/profile/experience?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      await fetchProfile()
      toast.success("Pengalaman kerja berhasil dihapus!")
    } catch {
      setError("Gagal menghapus pengalaman")
      toast.error("Gagal menghapus pengalaman")
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Confirm Delete Education Dialog */}
      <ConfirmDialog
        open={deleteEduId !== null}
        onClose={() => setDeleteEduId(null)}
        onConfirm={async () => {
          if (deleteEduId) await handleDeleteEducation(deleteEduId)
        }}
        title="HAPUS RIWAYAT PENDIDIKAN"
        description="Apakah Anda yakin ingin menghapus data pendidikan ini? Tindakan ini tidak dapat dibatalkan."
      />

      {/* Confirm Delete Experience Dialog */}
      <ConfirmDialog
        open={deleteExpId !== null}
        onClose={() => setDeleteExpId(null)}
        onConfirm={async () => {
          if (deleteExpId) await handleDeleteExperience(deleteExpId)
        }}
        title="HAPUS PENGALAMAN KERJA"
        description="Apakah Anda yakin ingin menghapus data pengalaman kerja ini? Tindakan ini tidak dapat dibatalkan."
      />
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          {success}
        </div>
      )}

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Pribadi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nama Lengkap"
              name="fullName"
              value={profile.fullName || ""}
              onChange={handleChange}
            />
            <Input
              label="Nomor Telepon"
              name="phone"
              value={profile.phone || ""}
              onChange={handleChange}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={profile.email || ""}
              onChange={handleChange}
            />
            <Input
              label="LinkedIn URL"
              name="linkedinUrl"
              value={profile.linkedinUrl || ""}
              onChange={handleChange}
            />
            <Input
              label="Portfolio URL"
              name="portfolioUrl"
              value={profile.portfolioUrl || ""}
              onChange={handleChange}
            />
            <Input
              label="Alamat"
              name="address"
              value={profile.address || ""}
              onChange={handleChange}
            />
          </div>
          <div className="mt-6">
            <Button onClick={handleSave} loading={saving}>
              Simpan Profil
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pendidikan</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingEdu({})
                setShowEduForm(true)
              }}
            >
              Tambah Pendidikan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showEduForm && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Institusi"
                  value={editingEdu?.institution || ""}
                  onChange={(e) => setEditingEdu((p) => ({ ...p, institution: e.target.value }))}
                />
                <Input
                  label="Gelar"
                  value={editingEdu?.degree || ""}
                  onChange={(e) => setEditingEdu((p) => ({ ...p, degree: e.target.value || null }))}
                />
                <Input
                  label="Jurusan"
                  value={editingEdu?.major || ""}
                  onChange={(e) => setEditingEdu((p) => ({ ...p, major: e.target.value || null }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Tahun Mulai"
                    type="number"
                    value={editingEdu?.startYear ?? ""}
                    onChange={(e) => setEditingEdu((p) => ({ ...p, startYear: e.target.value ? Number(e.target.value) : null }))}
                  />
                  <Input
                    label="Tahun Selesai"
                    type="number"
                    value={editingEdu?.endYear ?? ""}
                    onChange={(e) => setEditingEdu((p) => ({ ...p, endYear: e.target.value ? Number(e.target.value) : null }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={editingEdu?.id ? handleUpdateEducation : handleAddEducation}
                >
                  {editingEdu?.id ? "Update" : "Tambah"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowEduForm(false); setEditingEdu(null) }}
                >
                  Batal
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {(profile.educations ?? []).length === 0 && !showEduForm && (
              <p className="text-sm text-zinc-400">Belum ada data pendidikan.</p>
            )}
            {(profile.educations ?? []).map((edu) => (
              <div
                key={edu.id}
                className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{edu.institution}</p>
                  <p className="text-xs text-zinc-500">
                    {[edu.degree, edu.major].filter(Boolean).join(" - ")}
                    {edu.startYear && ` (${edu.startYear}${edu.endYear ? `-${edu.endYear}` : ""})`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingEdu(edu)
                      setShowEduForm(true)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setDeleteEduId(edu.id)}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pengalaman Kerja</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingExp({})
                setShowExpForm(true)
              }}
            >
              Tambah Pengalaman
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showExpForm && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Perusahaan"
                  value={editingExp?.company || ""}
                  onChange={(e) => setEditingExp((p) => ({ ...p, company: e.target.value }))}
                />
                <Input
                  label="Posisi"
                  value={editingExp?.position || ""}
                  onChange={(e) => setEditingExp((p) => ({ ...p, position: e.target.value }))}
                />
                <Input
                  label="Tanggal Mulai"
                  type="date"
                  value={editingExp?.startDate?.split("T")[0] || ""}
                  onChange={(e) => setEditingExp((p) => ({ ...p, startDate: e.target.value || null }))}
                />
                <Input
                  label="Tanggal Selesai"
                  type="date"
                  value={editingExp?.endDate?.split("T")[0] || ""}
                  onChange={(e) => setEditingExp((p) => ({ ...p, endDate: e.target.value || null }))}
                />
                <div className="col-span-full">
                  <Textarea
                    label="Deskripsi"
                    value={editingExp?.description || ""}
                    onChange={(e) => setEditingExp((p) => ({ ...p, description: e.target.value || null }))}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={editingExp?.id ? handleUpdateExperience : handleAddExperience}
                >
                  {editingExp?.id ? "Update" : "Tambah"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowExpForm(false); setEditingExp(null) }}
                >
                  Batal
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {(profile.experiences ?? []).length === 0 && !showExpForm && (
              <p className="text-sm text-zinc-400">Belum ada data pengalaman.</p>
            )}
            {(profile.experiences ?? []).map((exp) => (
              <div
                key={exp.id}
                className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{exp.position} @ {exp.company}</p>
                  <p className="text-xs text-zinc-500">
                    {exp.startDate && new Date(exp.startDate).toLocaleDateString("id-ID")}
                    {exp.endDate ? ` - ${new Date(exp.endDate).toLocaleDateString("id-ID")}` : " - Sekarang"}
                  </p>
                  {exp.description && (
                    <p className="mt-0.5 text-xs text-zinc-400 line-clamp-1">{exp.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingExp(exp)
                      setShowExpForm(true)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setDeleteExpId(exp.id)}
                  >
                    Hapus
                  </Button>
</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}