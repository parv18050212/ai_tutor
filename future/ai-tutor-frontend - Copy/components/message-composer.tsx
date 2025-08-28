"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useChat } from "ai/react"

interface MessageComposerProps {
  threadId: string
  onMessageSent?: () => void
}

export function MessageComposer({ threadId, onMessageSent }: MessageComposerProps) {
  const [message, setMessage] = useState("")

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: { threadId },
    onFinish: () => {
      setMessage("")
      onMessageSent?.()
    },
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isLoading) return

    // Set the input value and submit
    handleInputChange({ target: { value: message } } as any)
    handleSubmit(e, { data: { threadId } })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e)
    }
  }

  return (
    <div className="p-4">
      <form onSubmit={onSubmit} className="max-w-4xl mx-auto">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question or share what you'd like to learn about..."
              className="min-h-[60px] max-h-[200px] resize-none text-base"
              disabled={isLoading}
            />
            <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <span>{message.length}/2000</span>
            </div>
          </div>
          <Button type="submit" disabled={!message.trim() || isLoading} size="lg" className="px-6">
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
            <span className="ml-2">{isLoading ? "Sending..." : "Send"}</span>
          </Button>
        </div>
      </form>
    </div>
  )
}
