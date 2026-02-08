from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.services.retriever_improved import retrieve_chunks_async, RetrievalError
from app.services.llm_improved import generate_answer, explain_dom_element
from app.models.schemas import (
    ExplainRequest, ExplainDOMRequest, ExplainResponse
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/explain", response_model=ExplainResponse)
async def explain_code(request: ExplainRequest):
    """
    RAG-based code explanation endpoint.
    Retrieves relevant context from vector DB and generates explanation.
    """
    try:
        # Async retrieval with error handling
        context_chunks = await retrieve_chunks_async(
            project_id=request.project_id,
            query=request.query,
            limit=request.max_chunks
        )

        if not context_chunks:
            raise HTTPException(
                status_code=404,
                detail=f"No relevant context found for project '{request.project_id}'. "
                       "Ensure the project has been indexed."
            )

        # Build context with source attribution
        context_parts = []
        sources = []
        for i, chunk in enumerate(context_chunks, 1):
            context_parts.append(f"[Context {i}]\n{chunk['content']}")
            sources.append(chunk.get('file_path', 'unknown'))

        context = "\n\n".join(context_parts)

        # Enhanced prompt with structured output
        prompt = f"""You are a senior software engineer with deep expertise in code analysis.

Your task: Explain the code or answer the question using ONLY the provided context.

Context from codebase:
{context}

User Question:
{request.query}

Instructions:
- Provide a clear, structured explanation
- Reference specific code patterns when relevant
- If the context doesn't fully answer the question, acknowledge what's missing
- Do NOT generate new code unless explicitly asked
- Keep explanations concise but thorough

Answer:"""

        answer = await generate_answer(prompt, temperature=request.temperature)
        
        return ExplainResponse(
            explanation=answer,
            sources=sources[:3]  # Top 3 source files
        )

    except RetrievalError as e:
        logger.error(f"Retrieval error: {e}")
        raise HTTPException(status_code=500, detail=f"Retrieval failed: {str(e)}")
    except Exception as e:
        logger.error(f"Explanation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate explanation")


@router.post("/explain_dom", response_model=ExplainResponse)
async def explain_dom(request: ExplainDOMRequest):
    """
    Explain DOM elements and UI components from Chrome DevTools.
    This endpoint handles UI inspection without RAG (no project context).
    """
    try:
        # Build structured DOM context
        dom_context = f"""
URL: {request.url}
Element Tag: <{request.tag}>
CSS Classes: {', '.join(request.classes) if request.classes else 'none'}

HTML Structure:
{request.html[:5000]}  # Truncate to prevent token overflow
"""
        
        if request.css_rules:
            dom_context += f"\n\nApplied CSS:\n{request.css_rules[:2000]}"
        
        if request.parent_context:
            dom_context += f"\n\nParent Context:\n{request.parent_context[:2000]}"

        # Use specialized DOM explanation
        explanation = await explain_dom_element(dom_context, request.tag)

        return ExplainResponse(explanation=explanation)

    except Exception as e:
        logger.error(f"DOM explanation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to explain DOM element")


@router.post("/explain_stream")
async def explain_stream(request: ExplainRequest):
    """
    Streaming explanation endpoint for better UX.
    Returns Server-Sent Events (SSE) for progressive rendering.
    """
    # TODO: Implement streaming with async generators
    # This provides significantly better UX for long explanations
    raise HTTPException(status_code=501, detail="Streaming not yet implemented")
