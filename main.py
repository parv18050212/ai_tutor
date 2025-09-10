import os
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import jwt

# --- Initialization ---
load_dotenv()

# Configure Google AI
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Initialize Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Initialize FastAPI app
app = FastAPI()

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Request Model ---
class ChatRequest(BaseModel):
    question: str

# --- Auth Helper (Hardcoded User ID) ---
async def get_current_user(authorization: str = Header(None)):
    # For development, we'll use a hardcoded user ID
    # In production, you can implement proper JWT validation here
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            decoded = jwt.decode(token, options={"verify_signature": False})
            return decoded["sub"]  # Supabase UID
        except Exception as e:
            print(f"Token decode failed: {e}")
    
    # Fallback to hardcoded user ID for development
    return "06fb2f05-131e-47c1-8b75-3e393738e87c"

# --- DB Helpers ---        
def get_chat_history(user_id: str, limit: int = 6):
    """Fetch last N messages for a user, ordered by time."""
    resp = supabase.table("chat_history") \
        .select("role, message") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .limit(limit) \
        .execute()
    return list(reversed(resp.data)) if resp.data else []

def save_chat_turn(user_id: str, role: str, message: str):
    """Save one chat message."""
    supabase.table("chat_history").insert({
        "user_id": user_id,
        "role": role,
        "message": message
    }).execute()

# --- Prompt Template ---
SOCRATIC_PROMPT_TEMPLATE = """
You are an expert Socratic tutor for JEE Physics. 
Your job is to help the student learn by guiding them with questions, hints, and explanations, based ONLY on the provided course material and chat history. 
Follow these rules strictly:

1. Source of Truth
- Use ONLY the given {context} and {history}. 
- Never invent formulas, constants, or facts not present in {context}.
- When citing, include a short excerpt or reference ID if available.

2. Default Mode → Socratic
- Ask 1 open-ended guiding question at a time. 
- Provide up to 2 short hints (≤20 words each) that nudge reasoning, but do not reveal the final answer.
- Keep responses concise: ≤2 sentences + 1 guiding question.

3. Fallback Mode → Explanation
- If the student says “I don’t know”, “please explain”, or is clearly stuck, STOP questioning.
- Instead, give a clear, step-by-step explanation (2–3 steps, ≤80 words) using only {context}.
- After explaining, ask if the student would like to try a related practice question.

4. Understanding Check
- Occasionally, ask the student to summarize in their own words or apply the concept in a new situation.

5. Handling Missing/Conflicting Info
- If the answer is not in {context}, reply: 
  "No supporting material found. Please provide the relevant excerpt or clarify."
- If {context} has conflicting info, cite both and ask which one to use.

Inputs:
---
Chat history:
{history}

Course material:
{context}

Student’s question:
"{question}"

Now, generate your Socratic or explanatory response according to these rules.

"""

# --- API Endpoint ---
@app.post("/api/chat")
async def chat(request: ChatRequest, user_id: str = Depends(get_current_user)):
    question = request.question

    # 1. Embed question
    try:
        question_embedding = genai.embed_content(
            model="models/embedding-001",
            content=question,
            task_type="RETRIEVAL_QUERY"
        )['embedding']
    except Exception as e:
        return {"error": f"Embedding failed: {e}"}

    # 2. Vector search in Supabase
    try:
        matching_chunks = supabase.rpc("match_chunks", {
            "query_embedding": question_embedding,
            "match_threshold": 0.75,
            "match_count": 5
        }).execute()
        context = "\n\n".join([chunk["content"] for chunk in matching_chunks.data])
    except Exception as e:
        return {"error": f"Chunk search failed: {e}"}

    # 3. Fetch last N turns of chat history
    history_rows = get_chat_history(user_id, limit=6)
    history_text = "\n".join([f"{row['role']}: {row['message']}" for row in history_rows])

    # 4. Build prompt
    prompt = SOCRATIC_PROMPT_TEMPLATE.format(
        history=history_text,
        context=context,
        question=question
    )

    # 5. Call Gemini
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
        answer = response.text
    except Exception as e:
        return {"error": f"LLM call failed: {e}"}

    # 6. Save chat turn
    save_chat_turn(user_id, "student", question)
    save_chat_turn(user_id, "tutor", answer)

    return {"answer": answer}

# Additional endpoints for frontend support
@app.get("/api/chat/history")
async def get_chat_history_endpoint(user_id: str = Depends(get_current_user)):
    """Get chat history for the current user."""
    try:
        history = get_chat_history(user_id, limit=50)
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get chat history: {e}")

@app.post("/api/chat/clear")
async def clear_chat_history(user_id: str = Depends(get_current_user)):
    """Clear chat history for the current user."""
    try:
        supabase.table("chat_history").delete().eq("user_id", user_id).execute()
        return {"message": "Chat history cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear chat history: {e}")

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "message": "AI Physics Tutor API is running"}