from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routes.ingest_improved import router as ingest_router
from app.routes.explain_improved import router as explain_router
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RAG Code & UI Explainer",
    version="1.0.0",
    description="Production-grade RAG system for code and UI understanding"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "vscode-webview://*",  # VS Code webviews
        "http://localhost:*",   # Local development
        "chrome-extension://*"  # Chrome extension
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )

# Include routers
app.include_router(ingest_router, prefix="/api", tags=["ingestion"])
app.include_router(explain_router, prefix="/api", tags=["explanation"])

@app.get("/", tags=["health"])
def health():
    return {
        "status": "running",
        "service": "RAG Code & UI Explainer",
        "version": "1.0.0"
    }

@app.get("/health", tags=["health"])
async def health_check():
    """Detailed health check with dependency status"""
    try:
        from app.config import supabase
        # Quick Supabase connection test
        supabase.table("code_chunks").select("id").limit(1).execute()
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
    
    return {
        "status": "running",
        "database": db_status,
        "embedding_model": "all-MiniLM-L6-v2",
        "llm_provider": "Groq (Llama 3.1)"
    }
