import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/profile/profile-form"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="flex h-10 items-center gap-2 rounded-[3px] border border-error-container/40 bg-error-container/10 px-4 text-xs font-mono text-error hover:bg-error-container hover:text-on-error-container transition-colors"
          >
            Logout
          </button>
        </form>
      </div>
      <ProfileForm />
    </div>
  )
}
