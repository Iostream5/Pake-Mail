import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { EmailAccountsList } from "@/components/email-accounts/email-accounts-list"

export default async function EmailAccountsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Akun Email</h1>
      <EmailAccountsList />
    </div>
  )
}
