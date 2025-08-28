"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

export async function updateProfile(profileId: string, updates: { display_name: string }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Unauthorized")
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", profileId).eq("id", user.id) // Ensure user can only update their own profile

  if (error) {
    throw new Error("Failed to update profile")
  }

  revalidatePath("/settings")
  revalidatePath("/dashboard")
}

export async function updateAccessibilityProfile(profileId: string, accessibilityProfileId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Unauthorized")
  }

  const { error } = await supabase
    .from("profiles")
    .update({ accessibility_profile_id: accessibilityProfileId })
    .eq("id", profileId)
    .eq("id", user.id) // Ensure user can only update their own profile

  if (error) {
    throw new Error("Failed to update accessibility profile")
  }

  revalidatePath("/settings")
  revalidatePath("/dashboard")
  revalidatePath("/onboarding")
}
