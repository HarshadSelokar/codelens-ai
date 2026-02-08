from app.config import supabase
from app.services.embedder_improved import embed_async
import asyncio
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class RetrievalError(Exception):
    """Custom exception for retrieval failures."""
    pass

async def retrieve_chunks_async(
    project_id: str,
    query: str,
    limit: int = 5,
    threshold: float = 0.7
) -> List[Dict]:
    """
    Async retrieval of semantically similar code chunks.
    
    Args:
        project_id: Project identifier
        query: User's natural language query
        limit: Maximum number of chunks to retrieve
        threshold: Similarity threshold (0-1, higher = more strict)
    
    Returns:
        List of matching chunks with content, file_path, and similarity score
    
    Raises:
        RetrievalError: If retrieval fails or RPC function is missing
    """
    try:
        # Generate query embedding asynchronously
        query_embedding = await embed_async(query)

        # Call Supabase RPC function for vector similarity search
        # Note: This RPC function must be created in Supabase (see docs)
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: supabase.rpc(
                "match_code_chunks",
                {
                    "query_embedding": query_embedding,
                    "match_threshold": threshold,
                    "match_count": limit,
                    "filter_project_id": project_id
                }
            ).execute()
        )

        if not response.data:
            logger.warning(f"No chunks found for project '{project_id}' with query: {query[:50]}...")
            return []

        logger.info(f"Retrieved {len(response.data)} chunks for project '{project_id}'")
        return response.data

    except Exception as e:
        logger.error(f"Retrieval failed for project '{project_id}': {e}", exc_info=True)
        raise RetrievalError(f"Vector search failed: {str(e)}")


async def retrieve_by_file(
    project_id: str,
    file_path: str
) -> List[Dict]:
    """
    Retrieve all chunks for a specific file.
    Useful for "explain this file" functionality.
    """
    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: supabase.table("code_chunks").select(
                "id,content,file_path,chunk_type,metadata"
            ).eq("project_id", project_id).eq("file_path", file_path).execute()
        )

        return response.data or []

    except Exception as e:
        logger.error(f"File retrieval failed: {e}")
        raise RetrievalError(f"Failed to retrieve file chunks: {str(e)}")


async def hybrid_retrieve(
    project_id: str,
    query: str,
    file_context: Optional[str] = None,
    limit: int = 5
) -> List[Dict]:
    """
    Hybrid retrieval combining semantic search with file context.
    If user is viewing a specific file, prioritize chunks from that file.
    """
    try:
        # Get semantic matches
        semantic_chunks = await retrieve_chunks_async(
            project_id, query, limit=limit * 2  # Get more candidates
        )

        if not file_context:
            return semantic_chunks[:limit]

        # Boost chunks from the current file
        boosted_chunks = []
        other_chunks = []

        for chunk in semantic_chunks:
            if chunk.get('file_path') == file_context:
                boosted_chunks.append(chunk)
            else:
                other_chunks.append(chunk)

        # Prioritize current file chunks, then fill with others
        result = boosted_chunks[:limit]
        remaining = limit - len(result)
        if remaining > 0:
            result.extend(other_chunks[:remaining])

        return result

    except Exception as e:
        logger.error(f"Hybrid retrieval failed: {e}")
        raise RetrievalError(f"Hybrid search failed: {str(e)}")


# Legacy sync function for backward compatibility
def retrieve_chunks(project_id: str, query: str, limit: int = 5):
    """Synchronous wrapper (deprecated, use retrieve_chunks_async)."""
    return asyncio.run(retrieve_chunks_async(project_id, query, limit))
