import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/profile/profile-form"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <ProfileForm />
    </div>
  )
}
