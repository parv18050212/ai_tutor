import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { OnboardingFlow } from "@/components/onboarding-flow"

export default async function OnboardingPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Check if user has already completed onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", data.user.id)
    .single()

  if (profile?.onboarding_completed) {
    redirect("/dashboard")
  }

  // Fetch accessibility profiles
  const { data: accessibilityProfiles } = await supabase.from("accessibility_profiles").select("*").order("name")

  return (
    <div className="min-h-screen bg-background">
      <OnboardingFlow userId={data.user.id} accessibilityProfiles={accessibilityProfiles || []} />
    </div>
  )
}
