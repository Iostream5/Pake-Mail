import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TemplateList } from "@/components/templates/template-list"

export default async function TemplatesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Template Email</h1>
      <TemplateList />
    </div>
  )
}
