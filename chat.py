import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
from auth import verify_firebase_token
from rag import retrieve_chunks
from prompts import SOCRATIC_PROMPT
from db import get_db_pool

logger = logging.getLogger(__name__)

router = APIRouter()

class ChatRequest(BaseModel):
    token: str
    query: str

class ChatResponse(BaseModel):
    answer: str

async def save_chat_message(user_id: int, question: str, response: str) -> None:
    """Save chat message to database."""
    pool = get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO chat_messages (user_id, question, response)
            VALUES ($1, $2, $3)
            """,
            user_id,
            question,
            response
        )

async def generate_socratic_response(query: str, context_chunks: list) -> str:
    """Generate Socratic tutor response using Gemini."""
    # Prepare context from chunks
    context = "\n\n".join([
        f"Course: {chunk['metadata'].get('course', 'Unknown')} - {chunk['metadata'].get('title', 'Unknown')}\n{chunk['content']}"
        for chunk in context_chunks
    ])
    
    # Fill Socratic prompt template
    prompt = SOCRATIC_PROMPT.format(context=context, question=query)
    
    try:
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Error generating Socratic response: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate response. Please try again."
        )

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    """
    Handle chat requests with Socratic tutoring approach.
    
    Flow:
    1. Verify Firebase authentication
    2. Retrieve relevant course content chunks
    3. Generate Socratic response using context
    4. Save conversation to database
    5. Return AI response
    """
    try:
        # 1. Verify Firebase user authentication
        user_info = await verify_firebase_token(request.token)
        user_id = user_info['user_id']
        logger.info(f"Authenticated user {user_id} for chat request")
        
        # 2. Retrieve relevant chunks using RAG
        context_chunks = await retrieve_chunks(request.query, top_k=5)
        logger.info(f"Retrieved {len(context_chunks)} relevant chunks for query")
        
        # Log retrieved chunks for debugging (remove in production)
        for i, chunk in enumerate(context_chunks):
            logger.debug(f"Chunk {i+1}: {chunk['metadata'].get('title', 'Unknown')} (similarity: {chunk['similarity_score']:.3f})")
        
        # 3. Generate Socratic response
        ai_response = await generate_socratic_response(request.query, context_chunks)
        logger.info("Generated Socratic response successfully")
        
        # 4. Save chat message to database
        await save_chat_message(user_id, request.query, ai_response)
        logger.info(f"Saved chat message for user {user_id}")
        
        # 5. Return response
        return ChatResponse(answer=ai_response)
        
    except ValueError as e:
        # Authentication errors
        logger.error(f"Authentication error: {e}")
        raise HTTPException(status_code=401, detail=str(e))
    
    except Exception as e:
        # Other errors
        logger.error(f"Unexpected error in chat endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred. Please try again."
        )