# retriever.py

from app.config import supabase
from app.services.embedder import embed


def retrieve_chunks(project_id: str, query: str, limit: int = 5):
    query_embedding = embed(query)

    response = supabase.rpc(
        "match_code_chunks",
        {
            "query_embedding": query_embedding,
            "match_threshold": 0.75,
            "match_count": limit,
            "project_id": project_id
        }
    ).execute()

    return [row["content"] for row in response.data]