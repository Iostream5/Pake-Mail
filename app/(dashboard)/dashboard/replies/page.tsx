import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ReplyList } from "@/components/replies/reply-list"

export default async function RepliesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div>
      <ReplyList />
    </div>
  )
}
