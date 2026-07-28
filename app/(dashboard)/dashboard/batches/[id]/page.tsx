import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { BatchDetail } from "@/components/batches/batch-detail"

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const { id } = await params

  return (
    <div>
      <BatchDetail batchId={id} />
    </div>
  )
}
