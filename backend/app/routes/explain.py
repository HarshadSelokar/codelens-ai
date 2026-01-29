from fastapi import APIRouter
from app.services.retriever import retrieve_chunks
from app.services.llm import generate_answer

router = APIRouter()

@router.post("/explain")
async def explain(
    project_id: str,
    query: str
):
    context_chunks = retrieve_chunks(project_id, query)

    context = "\n\n".join(context_chunks)

    prompt = f"""
You are a senior software engineer.
Answer ONLY using the context below.

Context:
{context}

Question:
{query}
"""

    answer = await generate_answer(prompt)
    return {"explanation": answer}
