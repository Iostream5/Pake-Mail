import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DocumentList } from "@/components/documents/document-list"

export default async function DocumentsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Document Library</h1>
      <DocumentList />
    </div>
  )
}
