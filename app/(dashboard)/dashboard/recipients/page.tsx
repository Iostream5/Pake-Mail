import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { RecipientList } from "@/components/recipients/recipient-list"

export default async function RecipientsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Database Perusahaan</h1>
      <RecipientList />
    </div>
  )
}
