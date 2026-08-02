"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MonoLabel } from "@/components/ui/mono-label"
import { Icon } from "@/components/ui/icon"

interface EmailAccount {
  id: string
  provider: string
  email: string
  isDefault: boolean
}

interface Template {
  id: string
  name: string
  subject: string
}

interface Document {
  id: string
  name: string
  category: string
}

interface Recipient {
  id: string
  companyName: string
  hrEmail: string
  position: string | null
}

const STEPS = ["Name", "Email", "Template", "Documents", "Recipients", "Schedule", "Preview"]
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

const DRAFT_KEY = "batch-wizard-draft"

export function BatchWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Step 1
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  // Step 2
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState("")

  // Step 3
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState("")

  // Step 4
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])

  // Step 5
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [recipientSearch, setRecipientSearch] = useState("")
  const [reapplyWarnings, setReapplyWarnings] = useState<Array<{companyName: string; hrEmail: string; previousBatchName: string; daysAgo: number}>>([])
  const [showReapplyWarning, setShowReapplyWarning] = useState(false)
  const [suggestedDocIds, setSuggestedDocIds] = useState<string[]>([])

  // Step 6
  const [scheduledAt, setScheduledAt] = useState("")
  const [delaySeconds, setDelaySeconds] = useState(60)
  const [activeHoursStart, setActiveHoursStart] = useState("08:00")
  const [activeHoursEnd, setActiveHoursEnd] = useState("17:00")
  const [activeDays, setActiveDays] = useState<string[]>(["MON", "TUE", "WED", "THU", "FRI"])
  const [startImmediately, setStartImmediately] = useState(true)

  // Auto-Resend (V3)
  const [resendEnabled, setResendEnabled] = useState(false)
  const [resendThresholdDays, setResendThresholdDays] = useState(7)
  const [resendMaxCount, setResendMaxCount] = useState(1)
  const [resendSettingsLoaded, setResendSettingsLoaded] = useState(false)

  // Load user's default resend settings
  useEffect(() => {
    if (resendSettingsLoaded) return
    fetch("/api/settings")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setResendEnabled(res.data.resendEnabledDefault)
          setResendThresholdDays(res.data.resendThresholdDaysDefault)
          setResendMaxCount(res.data.resendMaxCountDefault)
        }
        setResendSettingsLoaded(true)
      })
      .catch(() => setResendSettingsLoaded(true))
  }, [resendSettingsLoaded])

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/email-accounts")
      if (res.ok) {
        const data = await res.json()
        setEmailAccounts(data)
        const def = data.find((a: EmailAccount) => a.isDefault)
        if (def && !selectedAccount) setSelectedAccount(def.id)
      }
    } catch {}
  }, [selectedAccount])

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates")
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } catch {}
  }, [])

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents")
      if (res.ok) {
        const data = await res.json()
        setDocuments(data)
      }
    } catch {}
  }, [])

  const fetchRecipients = useCallback(async () => {
    try {
      const params = recipientSearch ? `?search=${encodeURIComponent(recipientSearch)}` : ""
      const res = await fetch(`/api/recipients${params}`)
      if (res.ok) {
        const data = await res.json()
        setRecipients(data)
      }
    } catch {}
  }, [recipientSearch])

  // Restore draft on mount (client-only, after hydration)
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        if (data.step) setStep(data.step)
        if (data.name) setName(data.name)
        if (data.description) setDescription(data.description)
        if (data.selectedAccount) setSelectedAccount(data.selectedAccount)
        if (data.selectedTemplate) setSelectedTemplate(data.selectedTemplate)
        if (data.selectedDocs) setSelectedDocs(data.selectedDocs)
        if (data.selectedRecipients) setSelectedRecipients(data.selectedRecipients)
        if (data.scheduledAt) setScheduledAt(data.scheduledAt)
        if (data.delaySeconds) setDelaySeconds(data.delaySeconds)
        if (data.activeHoursStart) setActiveHoursStart(data.activeHoursStart)
        if (data.activeHoursEnd) setActiveHoursEnd(data.activeHoursEnd)
        if (data.activeDays) setActiveDays(data.activeDays)
        if (data.startImmediately !== undefined) setStartImmediately(data.startImmediately)
        if (data.resendEnabled !== undefined) setResendEnabled(data.resendEnabled)
        if (data.resendThresholdDays) setResendThresholdDays(data.resendThresholdDays)
        if (data.resendMaxCount) setResendMaxCount(data.resendMaxCount)
      }
    } catch {}
    setHydrated(true)
  }, [])

  // Auto-save draft to localStorage after hydrate
  useEffect(() => {
    if (!hydrated) return
    const data = {
      step, name, description, selectedAccount, selectedTemplate,
      selectedDocs, selectedRecipients, scheduledAt, delaySeconds,
      activeHoursStart, activeHoursEnd, activeDays, startImmediately,
      resendEnabled, resendThresholdDays, resendMaxCount,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data))
  }, [
    hydrated, step, name, description, selectedAccount, selectedTemplate,
    selectedDocs, selectedRecipients, scheduledAt, delaySeconds,
    activeHoursStart, activeHoursEnd, activeDays, startImmediately,
    resendEnabled, resendThresholdDays, resendMaxCount,
  ])

  const handleCancel = () => {
    localStorage.removeItem(DRAFT_KEY)
    router.push("/dashboard/batches")
  }

  useEffect(() => {
    if (step === 1) fetchAccounts()
  }, [step, fetchAccounts])

  useEffect(() => {
    if (step === 2) fetchTemplates()
  }, [step, fetchTemplates])

  useEffect(() => {
    if (step === 3) fetchDocuments()
  }, [step, fetchDocuments])

  useEffect(() => {
    if (step === 4) fetchRecipients()
  }, [step, fetchRecipients])

  useEffect(() => {
    if (selectedRecipients.length === 0) { setReapplyWarnings([]); return }
    const selected = recipients.filter(r => selectedRecipients.includes(r.id))
    const emails = selected.map(r => r.hrEmail)
    fetch("/api/batches/reapply-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hrEmails: emails }),
    }).then(res => res.json()).then(data => {
      setReapplyWarnings(data.warnings || [])
    }).catch(() => {})
  }, [selectedRecipients, recipients])

  useEffect(() => {
    if (step === 3 && documents.length > 0 && selectedRecipients.length > 0) {
      const selected = recipients.filter(r => selectedRecipients.includes(r.id))
      const positions = selected.map(r => r.position).filter((p): p is string => p !== null)
      if (positions.length > 0) {
        const keywords = [...new Set(positions.flatMap(p => p.toLowerCase().split(/\s+/)).filter(k => k.length > 2))]
        const matchedIds = documents
          .filter(doc => keywords.some(kw => doc.name.toLowerCase().includes(kw)))
          .map(d => d.id)
        setSuggestedDocIds(matchedIds)
        setSelectedDocs(prev => [...new Set([...prev, ...matchedIds])])
      }
    } else if (step !== 3) {
      setSuggestedDocIds([])
    }
  }, [step, documents, selectedRecipients, recipients])

  const toggleDoc = (id: string) => {
    setSelectedDocs((p) => p.includes(id) ? p.filter((d) => d !== id) : [...p, id])
  }

  const toggleRecipient = (id: string) => {
    setSelectedRecipients((p) => p.includes(id) ? p.filter((r) => r !== id) : [...p, id])
  }

  const toggleDay = (day: string) => {
    setActiveDays((p) => p.includes(day) ? p.filter((d) => d !== day) : [...p, day])
  }

  const canNext = (): boolean => {
    switch (step) {
      case 0: return name.trim().length > 0
      case 1: return selectedAccount !== ""
      case 2: return selectedTemplate !== ""
      case 3: return true
      case 4: return selectedRecipients.length > 0
      case 5: return true
      case 6: return true
      default: return false
    }
  }

  const handleNext = () => {
    if (!canNext()) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          emailAccountId: selectedAccount,
          templateId: selectedTemplate,
          delaySeconds,
          activeHoursStart,
          activeHoursEnd,
          activeDays: activeDays.join(","),
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          resendEnabledOverride: resendEnabled || null,
          resendThresholdDaysOverride: resendThresholdDays,
          resendMaxCountOverride: resendMaxCount,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create batch")
      }
      const batch = await res.json()
      const batchId = batch.id

      if (selectedRecipients.length > 0) {
        const rRes = await fetch("/api/batches/recipients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId, recipientIds: selectedRecipients }),
        })
        if (!rRes.ok) throw new Error("Failed to link recipients")
      }

      if (selectedDocs.length > 0) {
        const dRes = await fetch("/api/batches/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId, documentIds: selectedDocs }),
        })
        if (!dRes.ok) throw new Error("Failed to link documents")
      }

      if (startImmediately && !scheduledAt) {
        const startRes = await fetch("/api/batches/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: batchId }),
        })
        if (!startRes.ok) {
          const startErr = await startRes.json().catch(() => ({ error: "Failed to start batch" }))
          setError(startErr.error || "Batch created but failed to start")
        }
      }

      localStorage.removeItem(DRAFT_KEY)
      router.push(`/dashboard/batches/${batchId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create batch")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto pb-2 border-b border-ash-stroke custom-scrollbar">
        <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 shrink-0">
            <div className={cn(
              "flex h-7 px-3 items-center justify-center border text-xs font-mono transition-colors",
              i < step ? "bg-bone text-ink-black border-bone" : i === step ? "bg-carbon-lift text-bone border-graphite-mid" : "bg-transparent text-warm-granite border-ash-stroke"
            )}>
              {`0${i + 1}`}
            </div>
            <span className={cn(
              "text-xs font-mono uppercase tracking-widest",
              i === step ? "text-bone" : "text-warm-granite"
            )}>
              {s}
            </span>
            {i < STEPS.length - 1 && <Icon name="chevron_right" className="text-ash-stroke text-sm" />}
          </div>
        ))}
      </div>
      </div>

      {error && <div className="rounded border border-error bg-error-container p-3 text-sm text-error">{error}</div>}

      <Card variant="dark" className="p-6 border-ash-stroke bg-carbon-lift">
        {step === 0 && (
          <div className="space-y-6">
            <h3 className="text-lg font-mono text-bone uppercase tracking-widest">Name your batch</h3>
            <div className="space-y-2">
              <MonoLabel>Batch Name</MonoLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Software Engineer Q3 2026"
                className="bg-obsidian-canvas border-ash-stroke text-bone focus:border-bone"
              />
            </div>
            <div className="space-y-2">
              <MonoLabel>Description (optional)</MonoLabel>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded border border-ash-stroke bg-obsidian-canvas px-3 py-2 text-sm text-bone outline-none focus:border-bone resize-none font-mono placeholder:text-graphite-mid"
                placeholder="Any notes about this batch"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-mono text-bone uppercase tracking-widest">Select email account</h3>
            {emailAccounts.length === 0 && <p className="text-sm text-warm-granite font-mono">No email accounts connected.</p>}
            <div className="space-y-2">
              {emailAccounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccount(acc.id)}
                  className={cn(
                    "w-full rounded border p-4 text-left transition-colors flex items-center justify-between",
                    selectedAccount === acc.id
                      ? "border-bone bg-obsidian-canvas"
                      : "border-ash-stroke hover:border-graphite-mid bg-obsidian-canvas"
                  )}
                >
                  <div>
                    <p className="text-sm font-mono text-bone">{acc.email}</p>
                    <p className="text-xs font-mono text-warm-granite mt-1">{acc.provider}</p>
                  </div>
                  {selectedAccount === acc.id && <Icon name="check" className="text-bone" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-mono text-bone uppercase tracking-widest">Select template</h3>
            {templates.length === 0 && <p className="text-sm text-warm-granite font-mono">No templates found.</p>}
            <div className="space-y-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl.id)}
                  className={cn(
                    "w-full rounded border p-4 text-left transition-colors flex items-center justify-between",
                    selectedTemplate === tpl.id
                      ? "border-bone bg-obsidian-canvas"
                      : "border-ash-stroke hover:border-graphite-mid bg-obsidian-canvas"
                  )}
                >
                  <div>
                    <p className="text-sm font-mono text-bone">{tpl.name}</p>
                    <p className="text-xs font-mono text-warm-granite truncate mt-1">{tpl.subject}</p>
                  </div>
                  {selectedTemplate === tpl.id && <Icon name="check" className="text-bone" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-mono text-bone uppercase tracking-widest">Select documents (optional)</h3>
            {documents.length === 0 && <p className="text-sm text-warm-granite font-mono">No documents found.</p>}
            {suggestedDocIds.length > 0 && (
              <p className="text-xs font-mono text-metric-green mb-2">{suggestedDocIds.length} dokumen tersarankan berdasarkan posisi recipient</p>
            )}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => toggleDoc(doc.id)}
                  className={cn(
                    "w-full rounded border p-4 text-left transition-colors",
                    selectedDocs.includes(doc.id)
                      ? "border-bone bg-obsidian-canvas"
                      : "border-ash-stroke hover:border-graphite-mid bg-obsidian-canvas"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-mono text-bone">{doc.name}</p>
                      <p className="text-xs font-mono text-warm-granite mt-1">{doc.category}</p>
                    </div>
                    {selectedDocs.includes(doc.id) && <Icon name="check_box" className="text-bone" />}
                    {!selectedDocs.includes(doc.id) && <Icon name="check_box_outline_blank" className="text-graphite-mid" />}
                  </div>
                </button>
              ))}
            </div>
            {selectedDocs.length > 0 && (
              <p className="text-xs font-mono text-signal-orange">{selectedDocs.length} document(s) selected</p>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-mono text-bone uppercase tracking-widest">Select recipients</h3>
            <Input
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              placeholder="Search recipients..."
              className="bg-obsidian-canvas border-ash-stroke text-bone focus:border-bone"
            />
            {recipients.length === 0 && <p className="text-sm text-warm-granite font-mono">No recipients found.</p>}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {recipients.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => toggleRecipient(rec.id)}
                  className={cn(
                    "w-full rounded border p-4 text-left transition-colors",
                    selectedRecipients.includes(rec.id)
                      ? "border-bone bg-obsidian-canvas"
                      : "border-ash-stroke hover:border-graphite-mid bg-obsidian-canvas"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-mono text-bone">{rec.companyName}</p>
                      <p className="text-xs font-mono text-warm-granite mt-1">{rec.hrEmail}{rec.position ? ` · ${rec.position}` : ""}</p>
                    </div>
                    {selectedRecipients.includes(rec.id) && <Icon name="check_box" className="text-bone" />}
                    {!selectedRecipients.includes(rec.id) && <Icon name="check_box_outline_blank" className="text-graphite-mid" />}
                  </div>
                </button>
              ))}
            </div>
            {selectedRecipients.length > 0 && (
              <p className="text-xs font-mono text-signal-orange">{selectedRecipients.length} recipient(s) selected</p>
            )}
            {reapplyWarnings.length > 0 && (
              <div className="space-y-2 mt-4">
                {reapplyWarnings.map((w, i) => (
                  <div key={i} className="rounded border border-signal-orange/30 bg-signal-orange/5 p-3">
                    <p className="text-xs text-signal-orange">
                      <strong>{w.companyName}</strong> sudah dilamar {w.daysAgo} hari lalu (batch: {w.previousBatchName}), belum ada balasan.
                    </p>
                    <p className="text-[10px] text-warm-granite mt-1">Tetap lanjutkan? Anda bisa melanjutkan, ini hanya peringatan.</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h3 className="text-lg font-mono text-bone uppercase tracking-widest">Schedule settings</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <MonoLabel>Schedule date & time (optional)</MonoLabel>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="bg-obsidian-canvas border-ash-stroke text-bone focus:border-bone [color-scheme:dark]"
                />
              </div>
              <div className="space-y-2">
                <MonoLabel>Delay between emails (seconds)</MonoLabel>
                <Input
                  type="number"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  min={5}
                  className="bg-obsidian-canvas border-ash-stroke text-bone focus:border-bone"
                />
              </div>
              <div className="space-y-2">
                <MonoLabel>Active hours start</MonoLabel>
                <Input
                  type="time"
                  value={activeHoursStart}
                  onChange={(e) => setActiveHoursStart(e.target.value)}
                  className="bg-obsidian-canvas border-ash-stroke text-bone focus:border-bone [color-scheme:dark]"
                />
              </div>
              <div className="space-y-2">
                <MonoLabel>Active hours end</MonoLabel>
                <Input
                  type="time"
                  value={activeHoursEnd}
                  onChange={(e) => setActiveHoursEnd(e.target.value)}
                  className="bg-obsidian-canvas border-ash-stroke text-bone focus:border-bone [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <MonoLabel>Active days</MonoLabel>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "rounded border px-3 py-1.5 text-xs font-mono transition-colors",
                      activeDays.includes(day)
                        ? "border-bone bg-bone text-ink-black"
                        : "border-ash-stroke bg-obsidian-canvas text-warm-granite hover:border-graphite-mid"
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-mono text-bone mt-6 cursor-pointer">
              <div className={cn("w-4 h-4 border flex items-center justify-center rounded-sm", startImmediately ? "border-bone bg-bone" : "border-ash-stroke bg-obsidian-canvas")}>
                {startImmediately && <Icon name="check" className="text-ink-black text-xs" />}
              </div>
              <input
                type="checkbox"
                checked={startImmediately}
                onChange={(e) => setStartImmediately(e.target.checked)}
                className="hidden"
              />
              Start immediately after creation
            </label>

            <div className="border-t border-ash-stroke pt-6 mt-6">
              <h4 className="text-sm font-mono text-bone uppercase tracking-widest mb-4">Auto-Resend</h4>
              <label className="flex items-center gap-2 text-sm font-mono text-bone cursor-pointer mb-4">
                <div className={cn("w-4 h-4 border flex items-center justify-center rounded-sm", resendEnabled ? "border-bone bg-bone" : "border-ash-stroke bg-obsidian-canvas")}>
                  {resendEnabled && <Icon name="check" className="text-ink-black text-xs" />}
                </div>
                <input
                  type="checkbox"
                  checked={resendEnabled}
                  onChange={(e) => setResendEnabled(e.target.checked)}
                  className="hidden"
                />
                Enable Auto-Resend
              </label>
              {resendEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Resend threshold (days)"
                    type="number"
                    min={3}
                    value={resendThresholdDays}
                    onChange={(e) => setResendThresholdDays(Number(e.target.value))}
                    helperText="Min 3 days after first send"
                  />
                  <Input
                    label="Max resend count"
                    type="number"
                    min={1}
                    max={3}
                    value={resendMaxCount}
                    onChange={(e) => setResendMaxCount(Number(e.target.value))}
                    helperText="Max 3 times per company"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            <h3 className="text-lg font-mono text-bone uppercase tracking-widest">Summary</h3>
            <div className="border border-ash-stroke divide-y divide-ash-stroke bg-obsidian-canvas rounded">
              <div className="flex items-center justify-between p-4">
                <span className="text-xs font-mono text-warm-granite uppercase tracking-wider">Name</span>
                <span className="text-sm font-mono text-bone">{name}</span>
              </div>
              {description && (
                <div className="flex items-center justify-between p-4">
                  <span className="text-xs font-mono text-warm-granite uppercase tracking-wider">Description</span>
                  <span className="text-sm font-mono text-bone">{description}</span>
                </div>
              )}
              <div className="flex items-center justify-between p-4">
                <span className="text-xs font-mono text-warm-granite uppercase tracking-wider">Email Account</span>
                <span className="text-sm font-mono text-bone">{emailAccounts.find((a) => a.id === selectedAccount)?.email}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-xs font-mono text-warm-granite uppercase tracking-wider">Template</span>
                <span className="text-sm font-mono text-bone">{templates.find((t) => t.id === selectedTemplate)?.name}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-xs font-mono text-warm-granite uppercase tracking-wider">Documents</span>
                <span className="text-sm font-mono text-bone">
                  {selectedDocs.length > 0 ? `${selectedDocs.length} selected` : "None"}
                </span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-xs font-mono text-warm-granite uppercase tracking-wider">Recipients</span>
                <span className="text-sm font-mono text-bone">{selectedRecipients.length} selected</span>
              </div>
              {scheduledAt && (
                <div className="flex items-center justify-between p-4">
                  <span className="text-xs font-mono text-warm-granite uppercase tracking-wider">Scheduled</span>
                  <span className="text-sm font-mono text-bone">{new Date(scheduledAt).toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between p-4">
                <span className="text-xs font-mono text-warm-granite uppercase tracking-wider">Delay</span>
                <span className="text-sm font-mono text-bone">{delaySeconds}s</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-xs font-mono text-warm-granite uppercase tracking-wider">Active Hours</span>
                <span className="text-sm font-mono text-bone">{activeHoursStart} - {activeHoursEnd}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-xs font-mono text-warm-granite uppercase tracking-wider">Active Days</span>
                <span className="text-sm font-mono text-bone">{activeDays.join(", ")}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-xs font-mono text-warm-granite uppercase tracking-wider">Auto-Resend</span>
                <span className="text-sm font-mono text-bone">
                  {resendEnabled
                    ? `${resendThresholdDays}d, max ${resendMaxCount}x`
                    : "Disabled"}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between pt-4 border-t border-ash-stroke">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-error border-error-container/30 hover:bg-error-container/20 hover:text-on-error-container"
            onClick={handleCancel}
          >
            Batalkan
          </Button>
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 0}
          >
            BACK
          </Button>
        </div>
        {step < STEPS.length - 1 ? (
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={!canNext()}
          >
            NEXT <Icon name="arrow_forward" className="ml-2 text-sm" />
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "CREATING..." : "CREATE BATCH"}
          </Button>
        )}
      </div>
    </div>
  )
}
