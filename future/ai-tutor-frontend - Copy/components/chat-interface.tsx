"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { StudyThreadSidebar } from "@/components/study-thread-sidebar"
import { ChatMessages } from "@/components/chat-messages"
import { MessageComposer } from "@/components/message-composer"
import { NewThreadDialog } from "@/components/new-thread-dialog"
import type { User } from "@supabase/supabase-js"
import type { StudyThread, Profile } from "@/lib/types/database"

interface ChatInterfaceProps {
  user: User
  profile: Profile & {
    accessibility_profiles?: {
      name: string
      settings: Record<string, any>
    }
  }
  studyThreads: StudyThread[]
}

export function ChatInterface({ user, profile, studyThreads }: ChatInterfaceProps) {
  const [selectedThread, setSelectedThread] = useState<StudyThread | null>(
    studyThreads.length > 0 ? studyThreads[0] : null,
  )
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleNewThreadCreated = (newThread: StudyThread) => {
    setSelectedThread(newThread)
    window.location.reload() // Refresh to get updated thread list
  }

  const handleMessageSent = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Study Threads */}
      <div className={`${sidebarCollapsed ? "w-16" : "w-80"} transition-all duration-200 border-r border-border`}>
        <StudyThreadSidebar
          studyThreads={studyThreads}
          selectedThread={selectedThread}
          onThreadSelect={setSelectedThread}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          user={user}
          profile={profile}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedThread ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-balance">{selectedThread.title}</h2>
                  {selectedThread.subject && (
                    <p className="text-sm text-muted-foreground">Subject: {selectedThread.subject}</p>
                  )}
                </div>
                <Button variant="outline" size="sm">
                  Thread Settings
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-hidden">
              <ChatMessages threadId={selectedThread.id} refreshTrigger={refreshTrigger} />
            </div>

            {/* Message Composer */}
            <div className="border-t border-border">
              <MessageComposer threadId={selectedThread.id} onMessageSent={handleMessageSent} />
            </div>
          </>
        ) : (
          /* Welcome State */
          <div className="flex-1 flex items-center justify-center p-8">
            <Card className="p-8 max-w-md text-center">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-balance">
                  Welcome, {profile.display_name || "Student"}!
                </h3>
                <p className="text-muted-foreground text-balance">
                  Start a new conversation with your AI tutor or select an existing study thread from the sidebar.
                </p>
              </div>
              <NewThreadDialog onThreadCreated={handleNewThreadCreated} />
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
