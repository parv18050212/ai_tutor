"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { updateProfile, updateAccessibilityProfile } from "@/lib/actions/profile"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import type { Profile, AccessibilityProfile } from "@/lib/types/database"

interface ProfileSettingsProps {
  user: User
  profile: Profile & {
    accessibility_profiles?: AccessibilityProfile
  }
  accessibilityProfiles: AccessibilityProfile[]
}

export function ProfileSettings({ user, profile, accessibilityProfiles }: ProfileSettingsProps) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(profile.display_name || "")
  const [selectedAccessibilityProfile, setSelectedAccessibilityProfile] = useState(
    profile.accessibility_profile_id || "",
  )
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdateProfile = async () => {
    setIsUpdating(true)
    try {
      await updateProfile(profile.id, { display_name: displayName })
      router.refresh()
    } catch (error) {
      console.error("Error updating profile:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateAccessibilityProfile = async (profileId: string) => {
    setIsUpdating(true)
    try {
      await updateAccessibilityProfile(profile.id, profileId)
      setSelectedAccessibilityProfile(profileId)
      router.refresh()
    } catch (error) {
      console.error("Error updating accessibility profile:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal information and display preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {(displayName || user.email || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-medium">{displayName || "Student"}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>

            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input value={user.email || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed from this interface.</p>
            </div>

            <Button onClick={handleUpdateProfile} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility Profile</CardTitle>
          <CardDescription>Choose the accessibility profile that best supports your learning needs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Current Profile:</p>
              {profile.accessibility_profiles && (
                <Badge variant="secondary" className="text-sm">
                  {profile.accessibility_profiles.name}
                </Badge>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium">Available Profiles:</p>
              {accessibilityProfiles.map((accessProfile) => (
                <Card
                  key={accessProfile.id}
                  className={`cursor-pointer transition-colors ${
                    selectedAccessibilityProfile === accessProfile.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleUpdateAccessibilityProfile(accessProfile.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-balance">{accessProfile.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1 text-balance">{accessProfile.description}</p>
                      </div>
                      {selectedAccessibilityProfile === accessProfile.id && (
                        <div className="text-primary">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
          <CardDescription>Manage your account and session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Return to Dashboard</p>
              <p className="text-sm text-muted-foreground">Go back to your study sessions</p>
            </div>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sign Out</p>
              <p className="text-sm text-muted-foreground">Sign out of your account</p>
            </div>
            <Button variant="destructive" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
