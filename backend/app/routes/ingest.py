from fastapi import APIRouter
from app.config import supabase
from app.services.embedder import embed

router = APIRouter()

@router.post("/ingest")
async def ingest_chunk(
    project_id: str,
    file_path: str,
    content: str
):
    embedding = embed(content)

    supabase.table("code_chunks").insert({
        "project_id": project_id,
        "file_path": file_path,
        "chunk_type": "function",
        "content": content,
        "embedding": embedding
    }).execute()

    return {"status": "indexed"}
