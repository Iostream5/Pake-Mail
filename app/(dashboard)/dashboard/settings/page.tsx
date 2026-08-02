import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SettingsForm } from "@/components/settings/settings-form"
import { ExcludeListForm } from "@/components/settings/exclude-list-form"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-geist-sans)] text-2xl text-bone font-medium tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-warm-granite mt-0.5">
          Atur perilaku sistem, auto-resend, dan daftar pengecualian
        </p>
      </div>
      <div className="space-y-6 max-w-2xl">
        <SettingsForm />
        <ExcludeListForm />
      </div>
    </div>
  )
}
