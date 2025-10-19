# main.py
import os
from dotenv import load_dotenv

# IMPORTANT: Load .env BEFORE importing other modules
# This ensures OPENAI_API_KEY is available when voice modules load
load_dotenv()

from supabase import create_client, Client
import google.generativeai as genai
from fastapi import FastAPI, Depends, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import jwt
from jwt import exceptions as jwt_exceptions
import logging
from datetime import datetime
import uuid
from auth import get_current_user
from quiz import router as quiz_router, init_quiz_module
from smart_suggestions import router as suggestions_router, init_suggestions_module
from voice_router import router as voice_router
from realtime_voice import router as realtime_voice_router

logging.basicConfig(level=logging.INFO)

# Configure Google AI
google_api_key = os.getenv("GOOGLE_API_KEY", "")
if google_api_key:
    genai.configure(api_key=google_api_key)
else:
    logging.warning("GOOGLE_API_KEY not set. LLM calls will fail without it.")

# Initialize Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
if not supabase_url or not supabase_key:
    logging.error("SUPABASE_URL or SUPABASE_SERVICE_KEY missing in environment.")
supabase: Client = create_client(supabase_url, supabase_key)

# JWT secret for verifying Supabase JWTs (set this in env for production)
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://frontend-12131332.s3-website.ap-south-1.amazonaws.com","http://localhost:8080"],  # Add React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    question: str
    session_id: Optional[str] = None
    exam_id: Optional[str] = None
    subject_id: Optional[str] = None
    chapter_id: Optional[str] = None
    exam_name: Optional[str] = None
    subject_name: Optional[str] = None
    chapter_name: Optional[str] = None
    images: Optional[List[str]] = None
    accessibility_settings: Optional[dict] = None


# get_current_user function moved to auth.py to avoid circular imports

def get_or_create_session(user_id: str, exam_id: str, subject_id: str, chapter_id: str,
                          exam_name: str, subject_name: str, chapter_name: str):
    """Get existing session or create new one for the chapter"""
    try:
        # Check for existing active session for this chapter
        existing_session = supabase.table("chat_sessions") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("chapter_id", chapter_id) \
            .eq("status", "active") \
            .execute()

        if existing_session.data and len(existing_session.data) > 0:
            session = existing_session.data[0]
            # Update last activity
            supabase.table("chat_sessions") \
                .update({"updated_at": datetime.now().isoformat()}) \
                .eq("id", session["id"]) \
                .execute()
            return session["id"]
        else:
            # Create new session
            session_data = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "exam_id": exam_id,
                "subject_id": subject_id,
                "chapter_id": chapter_id,
                "session_name": f"{chapter_name} - {datetime.now().strftime('%Y-%m-%d')}",
                "status": "active",
                "message_count": 0,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "started_at": datetime.now().isoformat()
            }

            new_session = supabase.table("chat_sessions") \
                .insert(session_data) \
                .execute()

            return session_data["id"]
    except Exception as e:
        logging.exception("Failed to get/create session")
        raise HTTPException(status_code=500, detail=f"Session management failed: {e}")

def get_session_chat_history(session_id: str, limit: int = 6):
    """
    Get chat history for a specific session with conversation summary.

    Returns:
        dict with keys:
            - 'messages': list of recent messages
            - 'summary': conversation summary (str or None)
    """
    try:
        # Fetch recent messages
        resp = supabase.table("chat_history") \
            .select("role, message, created_at") \
            .eq("session_id", session_id) \
            .order("created_at", desc=True) \
            .limit(limit) \
            .execute()
        messages = list(reversed(resp.data or []))

        # Fetch conversation summary from chat_sessions
        session_resp = supabase.table("chat_sessions") \
            .select("conversation_summary") \
            .eq("id", session_id) \
            .single() \
            .execute()

        summary = session_resp.data.get("conversation_summary") if session_resp.data else None

        return {
            "messages": messages,
            "summary": summary
        }

    except Exception as e:
        logging.exception("Failed to fetch session chat history")
        return {"messages": [], "summary": None}

def save_session_chat_turn(user_id: str, session_id: str, role: str, message: str):
    """Save chat turn with session context and trigger auto-summarization"""
    try:
        # Insert chat message
        supabase.table("chat_history").insert({
            "user_id": user_id,
            "session_id": session_id,
            "role": role,
            "message": message,
            "created_at": datetime.now().isoformat()
        }).execute()

        # Update session message count and activity
        if role == "user":  # Only increment on user messages
            supabase.rpc("increment_session_message_count", {"session_id": session_id}).execute()

        supabase.table("chat_sessions") \
            .update({"updated_at": datetime.now().isoformat()}) \
            .eq("id", session_id) \
            .execute()

        # Auto-summarization trigger: Every 10 messages, generate summary
        if role == "assistant":  # Trigger after assistant responds
            try:
                # Get current message count
                session_resp = supabase.table("chat_sessions") \
                    .select("message_count") \
                    .eq("id", session_id) \
                    .single() \
                    .execute()

                message_count = session_resp.data.get("message_count", 0) if session_resp.data else 0

                # Trigger summarization every 10 messages
                if message_count > 0 and message_count % 10 == 0:
                    logging.info(f"Triggering auto-summarization for session {session_id} at {message_count} messages")
                    # Summarize messages from (message_count - 10) to (message_count - 6)
                    # This keeps last 6 messages unsummarized for the sliding window
                    start_idx = max(0, message_count - 16)
                    end_idx = message_count - 6
                    generate_conversation_summary(session_id, start_idx, end_idx)

            except Exception as summary_error:
                # Don't fail the save operation if summarization fails
                logging.error(f"Auto-summarization failed (non-critical): {summary_error}")

    except Exception as e:
        logging.exception("Failed to save session chat turn")

def get_chat_history(user_id: str, limit: int = 6):
    """Fallback function for backward compatibility"""
    try:
        resp = supabase.table("chat_history") \
            .select("role, message, created_at") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(limit) \
            .execute()
        rows = resp.data or []
        return list(reversed(rows))
    except Exception as e:
        logging.exception("Failed to fetch chat history")
        return []

def generate_conversation_summary(session_id: str, start_index: int = 0, end_index: int = 20):
    """
    Generate AI summary of conversation history for memory optimization.

    Args:
        session_id: The chat session ID
        start_index: Starting message index (0 = oldest message in session)
        end_index: Ending message index

    Returns:
        Summary string or None if failed
    """
    try:
        # Fetch messages in the range to summarize
        resp = supabase.table("chat_history") \
            .select("role, message, created_at") \
            .eq("session_id", session_id) \
            .order("created_at", desc=False) \
            .execute()

        all_messages = resp.data or []
        messages_to_summarize = all_messages[start_index:end_index]

        if not messages_to_summarize:
            logging.warning(f"No messages to summarize for session {session_id}")
            return None

        # Format messages for summarization
        conversation_text = "\n".join([
            f"{msg['role']}: {msg['message']}"
            for msg in messages_to_summarize
        ])

        # Create summarization prompt
        summary_prompt = f"""You are summarizing a tutoring conversation for memory optimization.

Conversation to summarize:
{conversation_text}

Create a concise summary (3-5 sentences) that captures:
1. Main topics discussed
2. Student's current understanding level
3. Key concepts explained
4. Areas where student struggled or asked for clarification

Focus on information that would help continue the tutoring session effectively."""

        # Generate summary using Gemini
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(
            summary_prompt,
            generation_config={
                "temperature": 0.1,
                "top_p": 0.1,
                "top_k": 20,
                "max_output_tokens": 256
            }
        )

        summary = getattr(response, "text", None) or str(response)
        logging.info(f"Generated conversation summary for session {session_id}: {len(summary)} chars")

        # Update chat_sessions with the summary
        supabase.table("chat_sessions") \
            .update({
                "conversation_summary": summary,
                "last_summarized_at": datetime.now().isoformat()
            }) \
            .eq("id", session_id) \
            .execute()

        return summary

    except Exception as e:
        logging.exception(f"Failed to generate conversation summary: {e}")
        return None

def get_cognitive_adaptive_prompt(accessibility_settings: dict) -> str:
    """Generate accessibility adaptations for cognitive disabilities"""
    if not accessibility_settings:
        return ""

    adaptations = []

    # ADHD adaptations
    if accessibility_settings.get('simplifyLanguage', False):
        adaptations.append("""
        - Keep questions short and focused (max 2 sentences)
        - Break complex concepts into micro-steps
        - Use clear transitions: "First... Then... Finally..."
        - Provide frequent positive reinforcement""")

    # Dyslexia adaptations
    if accessibility_settings.get('dyslexiaFont', False):
        adaptations.append("""
        - Avoid complex sentence structures
        - Use familiar, high-frequency words
        - Provide phonetic hints when introducing new terms
        - Repeat key concepts using different phrasing""")

    # Working memory support
    if accessibility_settings.get('lineSpacing', True):
        adaptations.append("""
        - Allow extra thinking time - don't rush responses
        - Provide multiple pathways to the same concept
        - Use concrete examples before abstract concepts
        - Check understanding frequently with simple questions""")

    # Text-to-speech considerations
    if accessibility_settings.get('textToSpeech', False):
        adaptations.append("""
        - Structure responses for clear audio reading
        - Use punctuation for natural speech pauses
        - Avoid complex formatting that doesn't read well aloud""")

    return "\n".join(adaptations) if adaptations else ""

def detect_frustration_markers(user_response: str) -> bool:
    """Detect if user is showing signs of frustration or confusion"""
    frustration_indicators = [
        "i don't understand", "this is hard", "i'm confused", "i don't know",
        "this doesn't make sense", "i'm lost", "i give up", "this is too difficult",
        "i can't", "help me", "i'm stuck", "frustrated", "overwhelming"
    ]

    response_lower = user_response.lower()
    return any(indicator in response_lower for indicator in frustration_indicators)

def provide_emotional_support(response: str, is_frustrated: bool = False) -> str:
    """Add emotional support to responses when needed"""
    if is_frustrated:
        encouragement = """🌟 It's okay! Learning takes time, and you're doing great by asking questions.

"""
        closing = """

💪 Remember: Every expert was once a beginner. You've got this! Let's break this down into smaller steps."""
        return f"{encouragement}{response}{closing}"
    return response

def add_memory_scaffold(response: str, current_concept: str, accessibility_settings: dict) -> str:
    """Add memory scaffolding for users with working memory challenges"""
    if not accessibility_settings or not accessibility_settings.get('simplifyLanguage', False):
        return response

    scaffold = f"""📋 **Where we are**: {current_concept}
💡 **Key point to remember**: Focus on one concept at a time

{response}

🔄 **Next step**: Think about this one question, then we'll move forward together"""

    return scaffold

def get_dynamic_socratic_prompt(exam_name: str, subject_name: str, chapter_name: str, accessibility_settings: Optional[dict] = None):
    """Generate dynamic Socratic prompt based on current educational context and accessibility needs"""

    # Base accessibility adaptations
    accessibility_adaptations = ""
    if accessibility_settings:
        cognitive_adaptations = get_cognitive_adaptive_prompt(accessibility_settings)
        if cognitive_adaptations:
            accessibility_adaptations = f"""

**ACCESSIBILITY ADAPTATIONS (Follow these STRICTLY):**
{cognitive_adaptations}

**EMOTIONAL SUPPORT GUIDELINES:**
- Watch for signs of frustration in student responses
- Provide encouragement and break down complex ideas
- Use positive reinforcement frequently
- Offer multiple ways to understand the same concept"""

    return f"""
You are "Newton," an expert AI Socratic tutor specializing in {exam_name} preparation, specifically for {subject_name}. You are currently helping a student with the "{chapter_name}" chapter. Your single most important goal is to guide the student to discover answers themselves through the Socratic method.

**Current Learning Context:**
- **Exam:** {exam_name}
- **Subject:** {subject_name}
- **Chapter:** {chapter_name}

**Core Directives (Follow these STRICTLY):**

1. **Explain when introducing NEW concepts (Mode 0), then guide with questions (Mode 1).** NEVER give away final answers to practice problems or homework.

2. **ALWAYS end your response with ONE open-ended guiding question** that probes their understanding or leads them to the next logical step.

3. **Stay focused on {chapter_name}** - relate all discussions back to this chapter's key concepts.

4. **Source of Truth:** Base all guidance strictly on the provided context and chat history. Do not introduce outside information.

5. **Input Handling:** If the student's question contains typos, grammatical errors, or unclear wording (common with voice input), INFER their intent and respond naturally. Do NOT point out typos or errors unless they fundamentally change the meaning. Examples:
   - "what us matrix" → interpret as "what is a matrix"
   - "explai matrices" → interpret as "explain matrices"
   - "how do i multipy matrix" → interpret as "how do i multiply matrices"
   - "wat r eigenvalues" → interpret as "what are eigenvalues"
   - If you truly cannot understand despite errors, ask: "I want to help! Could you clarify what topic you're asking about?"

6. **Empty Context Handling:** If the provided course material is empty or doesn't contain information about their question, say: "I don't see that topic in our {chapter_name} materials yet. Could you ask about a topic from this chapter, or try rephrasing your question?"

**Your Teaching Method (Choose the Right Mode):**

* **Mode 0: Introduction (Use When Student Asks "What is X?" or is Learning New Concept)**
    * **Trigger:** Student asks "what is", "explain", "define", "introduce", "tell me about", or mentions they haven't learned this yet
    * **Action:**
        - Provide a clear, concise explanation (2-3 sentences, max 60 words)
        - Use ONLY the provided context - don't make up information
        - Give a simple example if available in the context
        - End with ONE engaging question to check understanding or relate to real-world
    * **Example Format:** "[Clear definition]. [Simple example from context]. [One engaging question]"

* **Mode 1: Socratic Guiding (Use for Follow-ups, Practice, Deeper Understanding)**
    * **Trigger:** Student has baseline understanding and asks follow-up questions, requests practice, or wants to go deeper
    * **Action:**
        - Acknowledge their question with a tiny nudge (max 2 sentences)
        - Ask a clarifying or leading question specific to {chapter_name} concepts
        - If they struggle, provide up to two very short hints (under 15 words each) as questions

* **Mode 2: Explaining (Use When Student is Stuck/Frustrated)**
    * **Trigger:** Student explicitly says "I don't know," "I'm stuck," "give me the answer," "explain it," or shows clear frustration
    * **Action:**
        - Provide a step-by-step explanation (max 3 steps, under 80 words) using the context
        - Make it relatable to {chapter_name}
        - Re-engage: Ask "Would you like to try a related practice problem to solidify your understanding?"

**Chapter-Specific Guidance:**
Connect every concept to {chapter_name} and help them see how this fits into their {exam_name} {subject_name} preparation.

**Inputs:**

**Previous Conversation:**
{{history}}

**Relevant Course Material from {chapter_name}:**
{{context}}

**Student's Current Question:**
"{{question}}"

Now, as Newton, guide this student through {chapter_name} using the Socratic method.
"""


@app.post("/api/chat")
async def chat(request: ChatRequest, user_id: str = Depends(get_current_user)):
    question = request.question

    # Validate required parameters for session-based chat
    if not all([request.exam_id, request.subject_id, request.chapter_id,
                request.exam_name, request.subject_name, request.chapter_name]):
        raise HTTPException(status_code=400, detail="Missing required session parameters")

    # 1. Session Management
    try:
        session_id = get_or_create_session(
            user_id=user_id,
            exam_id=request.exam_id,
            subject_id=request.subject_id,
            chapter_id=request.chapter_id,
            exam_name=request.exam_name,
            subject_name=request.subject_name,
            chapter_name=request.chapter_name
        )
    except Exception as e:
        return {"error": f"Session management failed: {e}"}

    # 2. Embed with improved model (matching Edge Function)
    try:
        embedding_resp = genai.embed_content(
            model="models/text-embedding-004",  # Updated to match Edge Function
            content=question,
            task_type="RETRIEVAL_QUERY"
        )
        question_embedding = embedding_resp.get("embedding") if isinstance(embedding_resp, dict) else embedding_resp['embedding']
    except Exception as e:
        # Fallback to older model if text-embedding-004 not available
        try:
            embedding_resp = genai.embed_content(
                model="models/embedding-001",
                content=question,
                task_type="RETRIEVAL_QUERY"
            )
            question_embedding = embedding_resp.get("embedding") if isinstance(embedding_resp, dict) else embedding_resp['embedding']
        except Exception as fallback_e:
            return {"error": f"Embedding failed: {fallback_e}"}

    # 3. Vector search with improved threshold (matching Edge Function)
    try:
        matching_chunks = supabase.rpc("match_chunks", {
            "query_embedding": question_embedding,
            "match_threshold": 0.3,  # Lowered from 0.75 to match Edge Function
            "match_count": 5
        }).execute()
        chunks = matching_chunks.data or []
        context = "\n\n".join([c.get("content", "") for c in chunks])
    except Exception as e:
        return {"error": f"Chunk search failed: {e}"}

    # 4. Get session-specific history with conversation summary
    history_data = get_session_chat_history(session_id, limit=6)
    messages = history_data.get("messages", [])
    summary = history_data.get("summary")

    # Format history: [Optional Summary] + Recent Messages
    history_parts = []
    if summary:
        history_parts.append(f"[Previous Conversation Summary]\n{summary}\n")
    if messages:
        history_parts.append("[Recent Messages]")
        history_parts.extend([f"{msg.get('role')}: {msg.get('message')}" for msg in messages])

    history_text = "\n".join(history_parts) if history_parts else ""

    # 5. Dynamic prompt based on educational context and accessibility
    prompt_template = get_dynamic_socratic_prompt(
        request.exam_name,
        request.subject_name,
        request.chapter_name,
        request.accessibility_settings
    )
    prompt = prompt_template.format(history=history_text, context=context, question=question)

    # 6. LLM call
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature":0.1,
                "top_p": 0.1,
                "top_k": 40,
                "max_output_tokens": 512
            }
        )
        answer = getattr(response, "text", None) or (response.get("content") if isinstance(response, dict) else str(response))

        # 6.5. Apply accessibility post-processing
        if request.accessibility_settings:
            # Detect frustration and add emotional support
            is_frustrated = detect_frustration_markers(question)
            answer = provide_emotional_support(answer, is_frustrated)

            # Add memory scaffolding if needed
            answer = add_memory_scaffold(answer, request.chapter_name, request.accessibility_settings)

    except Exception as e:
        logging.error(f"LLM call failed: {str(e)}")
        return {
            "error": "I had trouble understanding your question. Could you try rephrasing it? "
                     "For example: 'What is a matrix?' or 'Explain this concept to me.'"
        }

    # 7. Save turns with session context
    save_session_chat_turn(user_id, session_id, "user", question)
    save_session_chat_turn(user_id, session_id, "assistant", answer)

    return {"answer": answer}

@app.get("/api/chat/history")
async def get_chat_history_endpoint(
    user_id: str = Depends(get_current_user),
    session_id: Optional[str] = None
):
    """Get chat history - session-specific if session_id provided, otherwise all user history"""
    try:
        if session_id:
            history = get_session_chat_history(session_id, limit=50)
        else:
            history = get_chat_history(user_id, limit=50)
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get chat history: {e}")

@app.post("/api/chat/clear")
async def clear_chat_history(
    user_id: str = Depends(get_current_user),
    session_id: Optional[str] = None
):
    """Clear chat history - session-specific if session_id provided, otherwise all user history"""
    try:
        if session_id:
            # Clear specific session history
            supabase.table("chat_history").delete().eq("session_id", session_id).execute()
            # Reset session message count
            supabase.table("chat_sessions") \
                .update({"message_count": 0, "updated_at": datetime.now().isoformat()}) \
                .eq("id", session_id) \
                .execute()
            return {"message": "Session chat history cleared successfully"}
        else:
            # Clear all user history (legacy behavior)
            supabase.table("chat_history").delete().eq("user_id", user_id).execute()
            return {"message": "Chat history cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear chat history: {e}")

@app.get("/api/sessions")
async def get_user_sessions(user_id: str = Depends(get_current_user)):
    """Get all chat sessions for a user"""
    try:
        sessions = supabase.table("chat_sessions") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("updated_at", desc=True) \
            .execute()
        return {"sessions": sessions.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get sessions: {e}")

@app.post("/api/sessions/{session_id}/archive")
async def archive_session(session_id: str, user_id: str = Depends(get_current_user)):
    """Archive a specific session"""
    try:
        # Verify session belongs to user
        session = supabase.table("chat_sessions") \
            .select("user_id") \
            .eq("id", session_id) \
            .eq("user_id", user_id) \
            .single() \
            .execute()

        if not session.data:
            raise HTTPException(status_code=404, detail="Session not found")

        # Archive the session
        supabase.table("chat_sessions") \
            .update({"status": "archived", "updated_at": datetime.now().isoformat()}) \
            .eq("id", session_id) \
            .execute()

        return {"message": "Session archived successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to archive session: {e}")










@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "AI Physics Tutor API is running"}

# Initialize quiz module with dependencies and include router
init_quiz_module(supabase, get_current_user)
app.include_router(quiz_router)

# Initialize smart suggestions module and include router
init_suggestions_module(supabase, get_current_user)
app.include_router(suggestions_router)

# Include voice router
app.include_router(voice_router)

# Include realtime voice router
app.include_router(realtime_voice_router)
