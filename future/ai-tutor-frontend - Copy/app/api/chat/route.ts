import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import axios from "axios"

export async function POST(req: Request) {
  try {
    const { messages, threadId } = await req.json()

    if (!threadId || !messages || !Array.isArray(messages)) {
      return new Response("Missing required fields", { status: 400 })
    }

    // Create Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response("Unauthorized", { status: 401 })
    }

    // Verify thread belongs to user
    const { data: thread, error: threadError } = await supabase
      .from("study_threads")
      .select("id")
      .eq("id", threadId)
      .eq("user_id", user.id)
      .single()

    if (threadError || !thread) {
      return new Response("Thread not found", { status: 404 })
    }

    // Save user message to database
    const userMessage = messages[messages.length - 1]
    const { error: messageError } = await supabase.from("messages").insert({
      thread_id: threadId,
      role: "user",
      content: userMessage.content,
    })

    if (messageError) {
      console.error("Error saving user message:", messageError)
      return new Response("Error saving message", { status: 500 })
    }

    const fastApiResponse = await axios.post(
      "http://127.0.0.1:8000/api/chat",
      {
        message: userMessage.content,
        thread_id: threadId,
        user_id: user.id,
        messages: messages,
      },
      {
        timeout: 30000, // 30 second timeout
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    const aiResponseContent =
      fastApiResponse.data.response || fastApiResponse.data.message || "I'm sorry, I couldn't process your request."

    const { error: aiMessageError } = await supabase.from("messages").insert({
      thread_id: threadId,
      role: "assistant",
      content: aiResponseContent,
    })

    if (aiMessageError) {
      console.error("Error saving AI message:", aiMessageError)
    }

    return Response.json({
      message: aiResponseContent,
      success: true,
    })
  } catch (error) {
    console.error("Chat API error:", error)

    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED") {
        return new Response("FastAPI server is not running", { status: 503 })
      }
      return new Response(`FastAPI error: ${error.message}`, { status: 500 })
    }

    return new Response("Internal server error", { status: 500 })
  }
}
