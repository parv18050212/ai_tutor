"use client"

import { useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import type { Message } from "@/lib/types/database"

interface ChatMessagesProps {
  threadId: string
  refreshTrigger?: number
}

export function ChatMessages({ threadId, refreshTrigger }: ChatMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })

      if (!error && data) {
        setMessages(data)
      }
      setIsLoading(false)
    }

    if (threadId) {
      fetchMessages()
    }
  }, [threadId, refreshTrigger])

  useEffect(() => {
    if (!threadId) return

    const supabase = createClient()

    const subscription = supabase
      .channel(`messages:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages((prev) => [...prev, newMessage])
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [threadId])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading messages...</div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <div className="mb-4">
            <svg
              className="w-12 h-12 mx-auto text-muted-foreground/50"
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
          <p className="text-balance">
            Start the conversation by asking a question or sharing what you'd like to learn about.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-6 max-w-4xl mx-auto">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {message.role === "assistant" && (
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">AI</AvatarFallback>
              </Avatar>
            )}

            <div
              className={`max-w-[70%] rounded-lg p-4 ${
                message.role === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"
              }`}
            >
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-balance">{message.content}</div>
              <div
                className={`text-xs mt-2 ${
                  message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                {new Date(message.created_at).toLocaleTimeString()}
              </div>
            </div>

            {message.role === "user" && (
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback className="text-sm">You</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
