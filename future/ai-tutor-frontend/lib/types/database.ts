export interface AccessibilityProfile {
  id: string
  name: string
  description: string
  icon: string
  settings: Record<string, any>
  created_at: string
}

export interface Profile {
  id: string
  display_name: string | null
  accessibility_profile_id: string | null
  custom_settings: Record<string, any>
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface StudyThread {
  id: string
  user_id: string
  title: string
  subject: string | null
  created_at: string
  updated_at: string
  last_message_at: string
}

export interface Message {
  id: string
  thread_id: string
  user_id: string
  content: string
  role: "user" | "assistant"
  metadata: Record<string, any>
  created_at: string
}
