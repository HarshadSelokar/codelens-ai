from sentence_transformers import SentenceTransformer
import asyncio
from functools import lru_cache
from typing import List
import logging

logger = logging.getLogger(__name__)

# Lazy load model (only when first used)
_model = None

def get_model():
    global _model
    if _model is None:
        logger.info("Loading embedding model: all-MiniLM-L6-v2")
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Embedding model loaded successfully")
    return _model

def embed(text: str) -> list:
    """Synchronous embedding (legacy)."""
    model = get_model()
    return model.encode(text).tolist()

async def embed_async(text: str) -> list:
    """
    Async embedding to prevent blocking the event loop.
    Runs the CPU-intensive encoding in a thread pool.
    """
    loop = asyncio.get_event_loop()
    model = get_model()
    
    # Run in executor to avoid blocking
    embedding = await loop.run_in_executor(None, model.encode, text)
    return embedding.tolist()

async def embed_batch(texts: List[str]) -> List[list]:
    """
    Batch embedding for efficiency.
    Much faster than encoding one-by-one during bulk ingestion.
    """
    if not texts:
        return []
    
    loop = asyncio.get_event_loop()
    model = get_model()
    
    # Batch encode is much more efficient
    embeddings = await loop.run_in_executor(None, model.encode, texts)
    return [emb.tolist() for emb in embeddings]

@lru_cache(maxsize=1024)
def embed_cached(text: str) -> tuple:
    """
    Cached embedding for frequently queried text.
    Useful for repeated queries during development.
    Returns tuple (immutable) for caching.
    """
    embedding = embed(text)
    return tuple(embedding)

def get_embedding_dimension() -> int:
    """Returns the dimension of the embedding model."""
    return 384  # all-MiniLM-L6-v2 produces 384-dimensional vectors
