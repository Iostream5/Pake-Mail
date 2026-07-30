import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TemplateList } from "@/components/templates/template-list"

export default async function TemplatesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return <TemplateList />
}
