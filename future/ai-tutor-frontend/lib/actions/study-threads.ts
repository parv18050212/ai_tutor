"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createStudyThread(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error("User not authenticated")
  }

  const title = formData.get("title") as string
  const subject = formData.get("subject") as string

  if (!title?.trim()) {
    throw new Error("Thread title is required")
  }

  const { data, error } = await supabase
    .from("study_threads")
    .insert({
      user_id: user.id,
      title: title.trim(),
      subject: subject?.trim() || null,
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw new Error("Failed to create study thread")
  }

  revalidatePath("/dashboard")
  return data
}

export async function updateStudyThread(threadId: string, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error("User not authenticated")
  }

  const title = formData.get("title") as string
  const subject = formData.get("subject") as string

  if (!title?.trim()) {
    throw new Error("Thread title is required")
  }

  const { error } = await supabase
    .from("study_threads")
    .update({
      title: title.trim(),
      subject: subject?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId)
    .eq("user_id", user.id)

  if (error) {
    throw new Error("Failed to update study thread")
  }

  revalidatePath("/dashboard")
}

export async function deleteStudyThread(threadId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error("User not authenticated")
  }

  // Delete all messages in the thread first (cascade should handle this, but being explicit)
  await supabase.from("messages").delete().eq("thread_id", threadId).eq("user_id", user.id)

  // Delete the thread
  const { error } = await supabase.from("study_threads").delete().eq("id", threadId).eq("user_id", user.id)

  if (error) {
    throw new Error("Failed to delete study thread")
  }

  revalidatePath("/dashboard")
}
