import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { EmailAccountsList } from "@/components/email-accounts/email-accounts-list"

export default async function EmailAccountsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div>
      <EmailAccountsList />
    </div>
  )
}
