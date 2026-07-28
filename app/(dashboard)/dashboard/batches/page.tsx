import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { BatchList } from "@/components/batches/batch-list"

export default async function BatchesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Batch Lamaran</h1>
      <BatchList />
    </div>
  )
}
