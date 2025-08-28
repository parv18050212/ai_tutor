"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { AccessibilityProfile } from "@/lib/types/database"

interface OnboardingFlowProps {
  userId: string
  accessibilityProfiles: AccessibilityProfile[]
}

const profileIcons = {
  focus: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  book: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  ),
  eye: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ),
  volume: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
}

export function OnboardingFlow({ userId, accessibilityProfiles }: OnboardingFlowProps) {
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleProfileSelect = (profileId: string) => {
    setSelectedProfile(profileId)
    setError(null)
  }

  const handleContinue = async () => {
    if (!selectedProfile) {
      setError("Please select an accessibility profile to continue")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Update user profile with selected accessibility profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          accessibility_profile_id: selectedProfile,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (updateError) throw updateError

      router.push("/dashboard")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4 text-balance">Welcome to Atypical Academy</h1>
        <p className="text-xl text-muted-foreground text-balance">
          Let's personalize your learning experience. Choose the accessibility profile that works best for you.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {accessibilityProfiles.map((profile) => (
          <Card
            key={profile.id}
            className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${
              selectedProfile === profile.id
                ? "border-primary bg-primary/5 shadow-lg"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => handleProfileSelect(profile.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                handleProfileSelect(profile.id)
              }
            }}
            aria-pressed={selectedProfile === profile.id}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-full ${
                    selectedProfile === profile.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {profileIcons[profile.icon as keyof typeof profileIcons] || profileIcons.focus}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl text-balance">{profile.name}</CardTitle>
                </div>
                {selectedProfile === profile.id && (
                  <div className="text-primary" aria-label="Selected">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base text-balance">{profile.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6" role="alert">
          <AlertDescription className="text-base">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center">
        <Button
          onClick={handleContinue}
          disabled={!selectedProfile || isLoading}
          size="lg"
          className="text-lg py-6 px-8"
        >
          {isLoading ? "Setting up your profile..." : "Continue to Dashboard"}
        </Button>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground text-balance">
          Don't worry - you can change your accessibility preferences anytime in your profile settings.
        </p>
      </div>
    </div>
  )
}
