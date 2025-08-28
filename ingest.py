import os
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
COURSE_MATERIALS_DIR = "course_materials"
EMBEDDING_MODEL = "models/embedding-001" # Or your chosen Gemini embedding model

def ingest_data():
    """
    Reads course materials, generates embeddings, and uploads them to Supabase.
    """
    print("Initializing clients...")
    # Initialize Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Configure Google AI client
    genai.configure(api_key=GOOGLE_API_KEY)
    
    print(f"Reading files from '{COURSE_MATERIALS_DIR}' directory...")
    
    data_to_upload = []

    # Loop through all files in the course materials directory
    for filename in os.listdir(COURSE_MATERIALS_DIR):
        if filename.endswith(".md"): # Process only markdown files
            file_path = os.path.join(COURSE_MATERIALS_DIR, filename)
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # --- Simple Chunking Strategy (by paragraph) ---
            # For a real application, you might use a more advanced library like LangChain
            chunks = content.split('\n\n')
            
            print(f"Processing {len(chunks)} chunks from {filename}...")
            
            for chunk in chunks:
                if not chunk.strip(): # Skip empty chunks
                    continue
                
                # Generate embedding for the chunk
                try:
                    embedding_result = genai.embed_content(
                        model=EMBEDDING_MODEL,
                        content=chunk,
                        task_type="RETRIEVAL_DOCUMENT"
                    )
                    
                    # Prepare data for upload
                    data_to_upload.append({
                        "content": chunk,
                        "embedding": embedding_result['embedding'],
                        "source_metadata": {"file": filename}
                    })
                except Exception as e:
                    print(f"Error generating embedding for a chunk in {filename}: {e}")

    # Batch upload to Supabase
    if data_to_upload:
        print(f"\nUploading {len(data_to_upload)} chunks to Supabase...")
        try:
            supabase.table('course_chunks').insert(data_to_upload).execute()
            print("✅ Data ingestion complete!")
        except Exception as e:
            print(f"Error uploading to Supabase: {e}")

if __name__ == "__main__":
    ingest_data()