import os
import json
import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import google.generativeai as genai
from db import get_db_pool
import logging

logger = logging.getLogger(__name__)

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

@dataclass
class TextChunk:
    content: str
    chunk_index: int
    start_char: int
    end_char: int

def chunk_text(text: str, max_chunk_size: int = 1000, overlap: int = 100) -> List[TextChunk]:
    """
    Chunk text into smaller pieces with overlap.
    First tries to split by paragraphs, then by sentences if needed.
    """
    # Clean the text
    text = text.strip()
    if not text:
        return []
    
    chunks = []
    
    # First, try splitting by paragraphs
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    
    current_chunk = ""
    current_start = 0
    chunk_index = 0
    
    for para in paragraphs:
        # If adding this paragraph would exceed max size, finalize current chunk
        if current_chunk and len(current_chunk + "\n\n" + para) > max_chunk_size:
            end_char = current_start + len(current_chunk)
            chunks.append(TextChunk(
                content=current_chunk.strip(),
                chunk_index=chunk_index,
                start_char=current_start,
                end_char=end_char
            ))
            
            # Start new chunk with overlap
            chunk_index += 1
            if overlap > 0 and len(current_chunk) > overlap:
                overlap_text = current_chunk[-overlap:]
                current_chunk = overlap_text + "\n\n" + para
                current_start = end_char - overlap
            else:
                current_chunk = para
                current_start = end_char
        else:
            # Add paragraph to current chunk
            if current_chunk:
                current_chunk += "\n\n" + para
            else:
                current_chunk = para
    
    # Add final chunk if it exists
    if current_chunk:
        chunks.append(TextChunk(
            content=current_chunk.strip(),
            chunk_index=chunk_index,
            start_char=current_start,
            end_char=current_start + len(current_chunk)
        ))
    
    # If chunks are still too large, split by sentences
    final_chunks = []
    for chunk in chunks:
        if len(chunk.content) <= max_chunk_size:
            final_chunks.append(chunk)
        else:
            # Split by sentences
            sentences = re.split(r'(?<=[.!?])\s+', chunk.content)
            sub_chunk = ""
            sub_start = chunk.start_char
            sub_index = chunk.chunk_index
            
            for sentence in sentences:
                if sub_chunk and len(sub_chunk + " " + sentence) > max_chunk_size:
                    final_chunks.append(TextChunk(
                        content=sub_chunk.strip(),
                        chunk_index=sub_index,
                        start_char=sub_start,
                        end_char=sub_start + len(sub_chunk)
                    ))
                    sub_index += 1
                    sub_start += len(sub_chunk)
                    sub_chunk = sentence
                else:
                    if sub_chunk:
                        sub_chunk += " " + sentence
                    else:
                        sub_chunk = sentence
            
            if sub_chunk:
                final_chunks.append(TextChunk(
                    content=sub_chunk.strip(),
                    chunk_index=sub_index,
                    start_char=sub_start,
                    end_char=sub_start + len(sub_chunk)
                ))
    
    return final_chunks

async def embed_text(text: str) -> List[float]:
    """
    Generate embedding for a single text using Gemini API.
    """
    try:
        model = genai.GenerativeModel('models/embedding-001')
        result = genai.embed_content(
            model='models/embedding-001',
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        raise

async def get_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for multiple texts.
    """
    embeddings = []
    for text in texts:
        embedding = await embed_text(text)
        embeddings.append(embedding)
    return embeddings

async def store_chunk(content: str, embedding: List[float], metadata: Dict[str, Any]) -> int:
    """
    Store a chunk with its embedding and metadata in the database.
    Returns the chunk ID.
    """
    pool = get_db_pool()
    async with pool.acquire() as conn:
        chunk_id = await conn.fetchval(
            """
            INSERT INTO chunks (content, embedding, metadata)
            VALUES ($1, $2, $3)
            RETURNING id
            """,
            content,
            embedding,
            json.dumps(metadata)
        )
        return chunk_id

async def retrieve_chunks(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Retrieve the most relevant chunks for a query using cosine similarity.
    """
    # Get query embedding
    query_embedding = await embed_text(query)
    
    pool = get_db_pool()
    async with pool.acquire() as conn:
        # Perform cosine similarity search
        results = await conn.fetch(
            """
            SELECT 
                id,
                content,
                metadata,
                (embedding <=> $1::vector) as distance
            FROM chunks
            ORDER BY embedding <=> $1::vector
            LIMIT $2
            """,
            query_embedding,
            top_k
        )
        
        chunks = []
        for row in results:
            chunks.append({
                'id': row['id'],
                'content': row['content'],
                'metadata': json.loads(row['metadata']) if row['metadata'] else {},
                'similarity_score': 1 - row['distance']  # Convert distance to similarity
            })
        
        return chunks

async def generate_response(query: str, context_chunks: List[Dict[str, Any]]) -> str:
    """
    Generate a response using Gemini with retrieved context.
    """
    # Prepare context from chunks
    context = "\n\n".join([
        f"Course: {chunk['metadata'].get('course', 'Unknown')} - {chunk['metadata'].get('title', 'Unknown')}\n{chunk['content']}"
        for chunk in context_chunks
    ])
    
    prompt = f"""You are a helpful educational tutor. Use the following course materials to answer the student's question. If the information is not available in the provided materials, say so clearly.

Course Materials:
{context}

Student Question: {query}

Please provide a comprehensive answer based on the course materials above."""

    try:
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Error generating response: {e}")
        return "I'm sorry, I encountered an error while generating a response. Please try again."