import os
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --- Initialization ---
# Load environment variables
load_dotenv()

# Configure Google AI
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Initialize Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Initialize FastAPI app
app = FastAPI()

# --- CORS (Cross-Origin Resource Sharing) ---
# This allows your React frontend (on a different port) to talk to this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, you'd restrict this to your frontend's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Model for Request Body ---
# This defines the expected structure of the JSON data your API will receive.
class ChatRequest(BaseModel):
    question: str

# --- Socratic Prompt Template ---
# This is where you engineer the "personality" of your AI tutor.
SOCRATIC_PROMPT_TEMPLATE = """
You are an expert Socratic tutor for JEE Physics. Your goal is to guide the student to the answer without giving it away directly.
- **Analyze the user's question.**
- **Use the provided course material as your primary source of knowledge.**
- **Do not give the direct answer.** Instead, ask a leading question that makes the student think.
- **If the student is on the right track, affirm their thinking and ask a follow-up question to deepen their understanding.**
- **If the student is wrong, gently correct their misconception by asking a question that reveals the flaw in their logic.**
- **Keep your responses concise and focused on a single concept.**

Here is the relevant course material:
---
{context}
---

Here is the user's question:
"{question}"

Your Socratic question to the student:
"""

# --- API Endpoint ---
@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    This endpoint handles the entire chat logic.
    """
    question = request.question
    
    # 1. Generate an embedding for the user's question
    try:
        question_embedding = genai.embed_content(
            model="models/embedding-001",
            content=question,
            task_type="RETRIEVAL_QUERY"
        )['embedding']
    except Exception as e:
        return {"error": f"Failed to create embedding: {e}"}

    # 2. Perform a vector search in Supabase
    # We call the `match_chunks` function we created in the Supabase SQL Editor.
    try:
        matching_chunks = supabase.rpc('match_chunks', {
            'query_embedding': question_embedding,
            'match_threshold': 0.75,  # Adjust this threshold as needed
            'match_count': 5
        }).execute()
        
        # Combine the content of the matching chunks into a single context string
        context = "\n\n".join([chunk['content'] for chunk in matching_chunks.data])
    except Exception as e:
        return {"error": f"Failed to search for chunks: {e}"}

    # 3. Construct the prompt for the Gemini LLM
    prompt = SOCRATIC_PROMPT_TEMPLATE.format(context=context, question=question)

    # 4. Call the Gemini LLM to get the Socratic response
    try:
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        response = model.generate_content(prompt)
        
        return {"answer": response.text}
    except Exception as e:
        return {"error": f"Failed to generate response from LLM: {e}"}