import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { BatchWizard } from "@/components/batches/batch-wizard"

export default async function NewBatchPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Buat Batch Baru</h1>
      <BatchWizard />
    </div>
  )
}
