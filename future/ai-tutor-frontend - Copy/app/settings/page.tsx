import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { ProfileSettings } from "@/components/profile-settings"

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  // Get user profile with accessibility profile
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      *,
      accessibility_profiles (
        id,
        name,
        description,
        settings
      )
    `)
    .eq("id", user.id)
    .single()

  // Get all available accessibility profiles
  const { data: accessibilityProfiles } = await supabase.from("accessibility_profiles").select("*").order("name")

  if (!profile) {
    redirect("/onboarding")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-balance">Profile Settings</h1>
          <p className="text-muted-foreground mt-2 text-balance">
            Manage your account preferences and accessibility settings.
          </p>
        </div>

        <ProfileSettings user={user} profile={profile} accessibilityProfiles={accessibilityProfiles || []} />
      </div>
    </div>
  )
}
