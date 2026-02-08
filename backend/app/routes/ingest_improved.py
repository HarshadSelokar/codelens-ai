from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.config import supabase
from app.services.embedder_improved import embed_async
from app.services.ingestor_improved import chunk_content, deduplicate_check
from app.models.schemas import IngestRequest, IngestResponse, ProjectInfoResponse
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/ingest", response_model=IngestResponse)
async def ingest_chunk(request: IngestRequest, background_tasks: BackgroundTasks):
    """
    Ingest code chunks with intelligent chunking and deduplication.
    Supports batching for performance.
    """
    try:
        # Deduplicate check
        existing = await deduplicate_check(
            supabase, 
            request.project_id, 
            request.file_path
        )
        
        if existing:
            logger.info(f"Skipping duplicate: {request.file_path}")
            return IngestResponse(
                status="skipped_duplicate",
                project_id=request.project_id,
                chunks_indexed=0
            )

        # Smart chunking based on content type
        chunks = chunk_content(
            content=request.content,
            file_path=request.file_path,
            chunk_type=request.chunk_type
        )

        logger.info(f"Generated {len(chunks)} chunks for {request.file_path}")

        # Batch embed and insert
        embeddings = []
        for chunk in chunks:
            embedding = await embed_async(chunk['content'])
            embeddings.append(embedding)

        # Bulk insert with error handling
        records = []
        for chunk, embedding in zip(chunks, embeddings):
            records.append({
                "project_id": request.project_id,
                "file_path": request.file_path,
                "chunk_type": request.chunk_type.value,
                "content": chunk['content'],
                "embedding": embedding,
                "metadata": {
                    "line_start": chunk.get('line_start'),
                    "line_end": chunk.get('line_end'),
                    "chunk_index": chunk.get('index'),
                    **(request.metadata or {})
                },
                "indexed_at": datetime.utcnow().isoformat()
            })

        result = supabase.table("code_chunks").insert(records).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to insert chunks")

        logger.info(f"Successfully indexed {len(records)} chunks for {request.project_id}")

        return IngestResponse(
            status="indexed",
            project_id=request.project_id,
            chunks_indexed=len(records)
        )

    except Exception as e:
        logger.error(f"Ingestion error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Ingestion failed: {str(e)}"
        )


@router.post("/ingest_batch")
async def ingest_batch(requests: list[IngestRequest]):
    """
    Batch ingestion endpoint for efficient bulk indexing.
    Used during full project indexing.
    """
    results = []
    for req in requests[:100]:  # Limit batch size
        try:
            result = await ingest_chunk(req, BackgroundTasks())
            results.append(result)
        except Exception as e:
            logger.error(f"Batch ingest failed for {req.file_path}: {e}")
            results.append({
                "status": "failed",
                "file_path": req.file_path,
                "error": str(e)
            })
    
    return {"results": results}


@router.delete("/project/{project_id}")
async def delete_project(project_id: str):
    """Delete all chunks for a project (for re-indexing)."""
    try:
        result = supabase.table("code_chunks").delete().eq(
            "project_id", project_id
        ).execute()
        
        return {"status": "deleted", "project_id": project_id}
    except Exception as e:
        logger.error(f"Project deletion error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete project")


@router.get("/project/{project_id}/info", response_model=ProjectInfoResponse)
async def get_project_info(project_id: str):
    """Get project indexing statistics and metadata."""
    try:
        # Get total chunks
        result = supabase.table("code_chunks").select(
            "id,file_path,indexed_at", count="exact"
        ).eq("project_id", project_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=404,
                detail=f"Project '{project_id}' not found or has no indexed content"
            )

        # Get unique files
        unique_files = len(set(row['file_path'] for row in result.data))
        
        # Get last indexed time
        last_indexed = max(
            (row.get('indexed_at') for row in result.data if row.get('indexed_at')),
            default=None
        )

        return ProjectInfoResponse(
            project_id=project_id,
            total_chunks=result.count or len(result.data),
            indexed_files=unique_files,
            last_indexed=last_indexed
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Project info error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve project info")
