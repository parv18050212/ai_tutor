import os
import re
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai
import pdfplumber
from langchain.text_splitter import RecursiveCharacterTextSplitter
from typing import List, Dict

# ----------------------------
# Load environment variables
# ----------------------------
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

COURSE_MATERIALS_DIR = "..\..\course_materials\chemistry_11"
EMBEDDING_MODEL = "models/embedding-001"
BATCH_SIZE = 10

# Init Supabase + Gemini``
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
genai.configure(api_key=GOOGLE_API_KEY)


# ----------------------------
# Semantic Chunking Helpers
# ----------------------------
def semantic_chunk_text(text: str, page_number: int) -> List[Dict]:
    """
    Splits text into semantic chunks: by headings, examples, and paragraphs,
    with overlap for continuity. Returns list of {content, metadata}.
    """
    chunks = []

    # 1. Split by headings (e.g., "1.1 Motion", "Example 2.3")
    sections = re.split(r'(\n[A-Z][^\n]{0,80}\n)', text)
    for section in sections:
        if not section.strip():
            continue

        # 2. Further split section into paragraphs
        paragraphs = section.split("\n\n")
        for para in paragraphs:
            para = para.strip()
            if len(para) < 50:
                continue

            # Detect if paragraph is an "Example"
            is_example = para.lower().startswith("example") or "solve" in para.lower()

            # 3. Use recursive splitter with overlap
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=500,
                chunk_overlap=80,
                length_function=len
            )
            sub_chunks = splitter.split_text(para)

            for i, sub in enumerate(sub_chunks):
                chunks.append({
                    "content": sub,
                    "metadata": {
                        "page_number": page_number,
                        "is_example": is_example,
                        "chunk_index": i
                    }
                })
    return chunks


def pdf_to_chunks(file_path: str) -> List[Dict]:
    """Extracts text from PDF and returns semantic chunks with metadata."""
    all_chunks = []
    with pdfplumber.open(file_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            page_text = page.extract_text()
            if not page_text:
                continue
            page_chunks = semantic_chunk_text(page_text, page_number=page_num)
            all_chunks.extend(page_chunks)
    return all_chunks


# ----------------------------
# Embedding + Upload
# ----------------------------
def embed_text(chunk: str):
    """Generates embedding using Gemini."""
    result = genai.embed_content(
        model=EMBEDDING_MODEL,
        content=chunk,
        task_type="RETRIEVAL_DOCUMENT"
    )
    return result["embedding"]


def ingest_pdfs():
    """Pipeline: PDF → semantic chunks → embeddings → Supabase."""
    for filename in os.listdir(COURSE_MATERIALS_DIR):
        if not filename.endswith(".pdf"):
            continue

        file_path = os.path.join(COURSE_MATERIALS_DIR, filename)
        print(f"\n📘 Processing {filename}...")

        # Step 1: Extract semantic chunks
        chunks = pdf_to_chunks(file_path)
        print(f"   → {len(chunks)} chunks created.")

        if not chunks:
            print(f"⚠️ Skipping {filename}, no chunks found.")
            continue

        # Step 2: Prepare data for Supabase
        data_to_upload = []
        for c in chunks:
            try:
                embedding = embed_text(c["content"])
                metadata = {
                    "class": "11",
                    "subject": "Physics",
                    "chapter": filename.replace(".pdf", ""),
                    "page_number": c["metadata"]["page_number"],
                    "is_example": c["metadata"]["is_example"],
                    "chunk_index": c["metadata"]["chunk_index"],
                    "file": filename
                }
                data_to_upload.append({
                    "content": c["content"],
                    "embedding": embedding,
                    "metadata": metadata
                })
            except Exception as e:
                print(f"   ⚠️ Embedding error: {e}")

        # Step 3: Upload in batches
        if data_to_upload:
            print(f"   → Uploading {len(data_to_upload)} chunks...")
            for i in range(0, len(data_to_upload), BATCH_SIZE):
                batch = data_to_upload[i:i + BATCH_SIZE]
                try:
                    supabase.table("course_chunks").insert(batch).execute()
                except Exception as e:
                    print(f"   ⚠️ Upload error in batch {i//BATCH_SIZE}: {e}")

    print("\n✅ All PDFs processed and uploaded!")


if __name__ == "__main__":
    ingest_pdfs()
