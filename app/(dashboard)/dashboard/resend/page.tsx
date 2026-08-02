import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ResendList } from "@/components/resend/resend-list"

export default async function ResendPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pending Resend</h1>
      <ResendList />
    </div>
  )
}
