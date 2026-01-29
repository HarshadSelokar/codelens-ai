# ingestor.py
from .embedder import embed
from supabase import create_client

def ingest_chunk(supabase, project_id, file_path, content):
    embedding = embed(content)
    supabase.table("code_chunks").insert({
        "project_id": project_id,
        "file_path": file_path,
        "chunk_type": "function",
        "content": content,
        "embedding": embedding
    }).execute()
