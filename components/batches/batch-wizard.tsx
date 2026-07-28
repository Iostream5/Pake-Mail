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

  // Step 6
  const [scheduledAt, setScheduledAt] = useState("")
  const [delaySeconds, setDelaySeconds] = useState(60)
  const [activeHoursStart, setActiveHoursStart] = useState("08:00")
  const [activeHoursEnd, setActiveHoursEnd] = useState("17:00")
  const [activeDays, setActiveDays] = useState<string[]>(["MON", "TUE", "WED", "THU", "FRI"])
  const [startImmediately, setStartImmediately] = useState(true)

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
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between pt-4 border-t border-ash-stroke">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={step === 0}
        >
          BACK
        </Button>
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
