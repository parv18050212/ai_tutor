import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ChatInterface } from "@/components/chat-interface"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Check if user has completed onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      onboarding_completed, 
      display_name, 
      accessibility_profile_id,
      accessibility_profiles (
        name,
        settings
      )
    `)
    .eq("id", data.user.id)
    .single()

  if (!profile?.onboarding_completed) {
    redirect("/onboarding")
  }

  // Fetch user's study threads
  const { data: studyThreads } = await supabase
    .from("study_threads")
    .select("*")
    .eq("user_id", data.user.id)
    .order("last_message_at", { ascending: false })

  return (
    <div className="h-screen bg-background">
      <ChatInterface user={data.user} profile={profile} studyThreads={studyThreads || []} />
    </div>
  )
}
