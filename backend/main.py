# main.py
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai
from fastapi import FastAPI, Depends, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import jwt
from jwt import exceptions as jwt_exceptions
import logging

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
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    question: str

async def get_current_user(authorization: str = Header(None)):
    if authorization is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header missing")
    parts = authorization.split()
    if parts[0].lower() != "bearer" or len(parts) != 2:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")
    token = parts[1]
    try:
        if SUPABASE_JWT_SECRET:
            decoded = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        else:
            # WARNING: insecure — only allowed for local dev when you can't verify signature
            logging.warning("SUPABASE_JWT_SECRET not set — decoding token WITHOUT verification (dev only).")
            decoded = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded.get("sub") or decoded.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token missing user id")
        return user_id
    except jwt_exceptions.PyJWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}")

def get_chat_history(user_id: str, limit: int = 6):
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

def save_chat_turn(user_id: str, role: str, message: str):
    try:
        supabase.table("chat_history").insert({
            "user_id": user_id,
            "role": role,
            "message": message
        }).execute()
    except Exception as e:
        logging.exception("Failed to save chat turn")

SOCRATIC_PROMPT_TEMPLATE = """
You are "Newton," an expert AI Socratic tutor for JEE Physics. Your single most important goal is to guide the student to discover the answer themselves, not to provide it directly.

**Core Directives (Follow these STRICTLY):**

1.  **NEVER give the final answer directly.** Your purpose is to guide, not to tell.
2.  **ALWAYS end your response with ONE open-ended guiding question** that probes the student's understanding or leads them to the next logical step.
3.  **Source of Truth:** Base all your guidance strictly on the provided {context} and {history}. Do not introduce outside information.

---
**Your Persona and Method:**

* **Mode 1: Socratic Guiding (Your Default Mode)**
    * **Initial Response:** Start by acknowledging their question and providing a tiny nudge. Your response must be concise (max 2 sentences).
    * **Guiding Question:** After the initial nudge, ask a clarifying or leading question.
    * **Hints:** If the student struggles, provide up to two very short hints (under 15 words each). Hints should be questions themselves or incomplete statements that require the student to think.

* **Mode 2: Explaining (Fallback Mode)**
    * **Trigger:** Only activate this mode if the student explicitly says "I don't know," "give me the answer," "explain it," or is clearly frustrated.
    * **Action:** Provide a concise, step-by-step explanation (max 3 steps, under 80 words) using the {context}.
    * **Re-engage:** After explaining, you MUST immediately ask, "Would you like to try a related practice problem to solidify your understanding?"

---
**Example of a good Socratic interaction:**

* **Student:** "What is Newton's Second Law?"
* **You (Good):** "That's a fundamental concept in mechanics. The law connects force, mass, and acceleration. Based on the context, what do you think is the relationship between those three variables? How might they be written in a formula?"

**Example of a bad, non-Socratic response:**

* **Student:** "What is Newton's Second Law?"
* **You (Bad):** "Newton's Second Law is F=ma, where F is force, m is mass, and a is acceleration."

---
**Inputs:**

**Chat History:**
{history}

**Course Material Context:**
{context}

**Student's Question:**
"{question}"

Now, embody the role of Newton and generate your Socratic response.
"""

@app.post("/api/chat")
async def chat(request: ChatRequest, user_id: str = Depends(get_current_user)):
    question = request.question
    # 1. Embed
    try:
        embedding_resp = genai.embed_content(
            model="models/embedding-001",
            content=question,
            task_type="RETRIEVAL_QUERY"
        )
        question_embedding = embedding_resp.get("embedding") if isinstance(embedding_resp, dict) else embedding_resp['embedding']
    except Exception as e:
        return {"error": f"Embedding failed: {e}"}

    # 2. Vector search
    try:
        matching_chunks = supabase.rpc("match_chunks", {
            "query_embedding": question_embedding,
            "match_threshold": 0.75,
            "match_count": 5
        }).execute()
        chunks = matching_chunks.data or []
        context = "\n\n".join([c.get("content", "") for c in chunks])
    except Exception as e:
        return {"error": f"Chunk search failed: {e}"}

    # 3. History
    history_rows = get_chat_history(user_id, limit=6)
    history_text = "\n".join([f"{r.get('role')}: {r.get('message')}" for r in history_rows])

    # 4. Prompt
    prompt = SOCRATIC_PROMPT_TEMPLATE.format(history=history_text, context=context, question=question)

    # 5. LLM call
    try:
        model = genai.GenerativeModel("gemini-2.5-flash-lite")
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
    except Exception as e:
        return {"error": f"LLM call failed: {e}"}

    # 6. Save turns (use roles 'user' and 'assistant' to match frontend)
    save_chat_turn(user_id, "user", question)
    save_chat_turn(user_id, "assistant", answer)

    return {"answer": answer}

@app.get("/api/chat/history")
async def get_chat_history_endpoint(user_id: str = Depends(get_current_user)):
    try:
        history = get_chat_history(user_id, limit=50)
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get chat history: {e}")

@app.post("/api/chat/clear")
async def clear_chat_history(user_id: str = Depends(get_current_user)):
    try:
        supabase.table("chat_history").delete().eq("user_id", user_id).execute()
        return {"message": "Chat history cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear chat history: {e}")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "AI Physics Tutor API is running"}
