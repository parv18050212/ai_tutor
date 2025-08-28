"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { NewThreadDialog } from "@/components/new-thread-dialog"
import { ThreadOptionsMenu } from "@/components/thread-options-menu"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"
import type { StudyThread, Profile } from "@/lib/types/database"

interface StudyThreadSidebarProps {
  studyThreads: StudyThread[]
  selectedThread: StudyThread | null
  onThreadSelect: (thread: StudyThread) => void
  collapsed: boolean
  onToggleCollapse: () => void
  user: User
  profile: Profile & {
    accessibility_profiles?: {
      name: string
      settings: Record<string, any>
    }
  }
}

export function StudyThreadSidebar({
  studyThreads,
  selectedThread,
  onThreadSelect,
  collapsed,
  onToggleCollapse,
  user,
  profile,
}: StudyThreadSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredThreads = studyThreads.filter(
    (thread) =>
      thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (thread.subject && thread.subject.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleThreadCreated = () => {
    // Refresh will happen via revalidatePath in server action
    window.location.reload()
  }

  const handleThreadUpdated = () => {
    // Refresh will happen via revalidatePath in server action
    window.location.reload()
  }

  const handleThreadDeleted = () => {
    // Refresh will happen via revalidatePath in server action
    window.location.reload()
  }

  if (collapsed) {
    return (
      <div className="h-full flex flex-col items-center py-4 space-y-4">
        <Button variant="ghost" size="sm" onClick={onToggleCollapse} aria-label="Expand sidebar">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
        <Separator />
        <div className="flex-1 w-full space-y-2">
          {studyThreads.slice(0, 5).map((thread) => (
            <Button
              key={thread.id}
              variant={selectedThread?.id === thread.id ? "default" : "ghost"}
              size="sm"
              className="w-full h-12 p-2"
              onClick={() => onThreadSelect(thread)}
              title={thread.title}
            >
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium">{thread.title.charAt(0).toUpperCase()}</span>
              </div>
            </Button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Study Threads</h2>
          <Button variant="ghost" size="sm" onClick={onToggleCollapse} aria-label="Collapse sidebar">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </Button>
        </div>

        {/* Search */}
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />

        <NewThreadDialog onThreadCreated={handleThreadCreated} />
      </div>

      {/* Thread List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredThreads.length > 0 ? (
            filteredThreads.map((thread) => (
              <div key={thread.id} className="group relative">
                <Button
                  variant={selectedThread?.id === thread.id ? "secondary" : "ghost"}
                  className="w-full justify-start h-auto p-3 text-left pr-10"
                  onClick={() => onThreadSelect(thread)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate text-balance">{thread.title}</div>
                    {thread.subject && (
                      <div className="text-xs text-muted-foreground truncate mt-1">{thread.subject}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(thread.last_message_at).toLocaleDateString()}
                    </div>
                  </div>
                </Button>
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ThreadOptionsMenu
                    thread={thread}
                    onThreadUpdated={handleThreadUpdated}
                    onThreadDeleted={handleThreadDeleted}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm text-balance">
                {searchQuery ? "No conversations match your search." : "No conversations yet."}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* User Profile Section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-sm">
              {(profile.display_name || user.email || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{profile.display_name || "Student"}</div>
            <div className="text-xs text-muted-foreground truncate">
              {profile.accessibility_profiles?.name || "Default Profile"}
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild aria-label="Profile settings">
            <Link href="/settings">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
