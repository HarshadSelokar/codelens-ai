from fastapi import FastAPI
from app.routes.ingest import router as ingest_router
from app.routes.explain import router as explain_router

app = FastAPI(title="RAG Code Explainer")

app.include_router(ingest_router, prefix="/api")
app.include_router(explain_router, prefix="/api")

@app.get("/")
def health():
    return {"status": "RAG backend running"}
