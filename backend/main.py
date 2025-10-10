# main.py
import os
from dotenv import load_dotenv
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

load_dotenv()
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
    """Get chat history for a specific session"""
    try:
        resp = supabase.table("chat_history") \
            .select("role, message, created_at") \
            .eq("session_id", session_id) \
            .order("created_at", desc=True) \
            .limit(limit) \
            .execute()
        rows = resp.data or []
        return list(reversed(rows))
    except Exception as e:
        logging.exception("Failed to fetch session chat history")
        return []

def save_session_chat_turn(user_id: str, session_id: str, role: str, message: str):
    """Save chat turn with session context"""
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
        encouragement = """🌟 **It's okay!** Learning takes time, and you're doing great by asking questions.

"""
        closing = """

💪 **Remember**: Every expert was once a beginner. You've got this! Let's break this down into smaller steps."""
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

1. **NEVER give the final answer directly.** Your purpose is to guide through questions, not to tell.
2. **ALWAYS end your response with ONE open-ended guiding question** that probes their understanding or leads them to the next logical step.
3. **Stay focused on {chapter_name}** - relate all discussions back to this chapter's key concepts.
4. **Source of Truth:** Base all guidance strictly on the provided context and chat history. Do not introduce outside information.

**Your Teaching Method:**

* **Mode 1: Socratic Guiding (Your Default Mode)**
    * Acknowledge their question and provide a tiny nudge (max 2 sentences)
    * Ask a clarifying or leading question specific to {chapter_name} concepts
    * If they struggle, provide up to two very short hints (under 15 words each) as questions

* **Mode 2: Explaining (Fallback Mode)**
    * **Trigger:** Only when student explicitly says "I don't know," "give me the answer," "explain it," or shows clear frustration
    * **Action:** Provide a concise, step-by-step explanation (max 3 steps, under 80 words) using the context
    * **Re-engage:** Ask "Would you like to try a related {chapter_name} practice problem to solidify your understanding?"

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

    # 4. Get session-specific history (instead of all user history)
    history_rows = get_session_chat_history(session_id, limit=6)
    history_text = "\n".join([f"{r.get('role')}: {r.get('message')}" for r in history_rows])

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
                "temperature": 0,
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
        return {"error": f"LLM call failed: {e}"}

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
