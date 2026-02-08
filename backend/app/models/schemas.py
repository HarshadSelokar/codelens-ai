from pydantic import BaseModel, Field, validator
from typing import Optional, List
from enum import Enum

class ChunkType(str, Enum):
    FUNCTION = "function"
    CLASS = "class"
    FILE = "file"
    DOM = "dom"

class IngestRequest(BaseModel):
    project_id: str = Field(..., min_length=1, max_length=100)
    file_path: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1, max_length=50000)
    chunk_type: ChunkType = ChunkType.FILE
    metadata: Optional[dict] = None

    @validator('project_id')
    def validate_project_id(cls, v):
        # Prevent SQL injection, ensure alphanumeric + underscore/dash
        if not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError('project_id must be alphanumeric with - or _')
        return v

class ExplainRequest(BaseModel):
    project_id: str = Field(..., min_length=1, max_length=100)
    query: str = Field(..., min_length=1, max_length=2000)
    max_chunks: int = Field(default=5, ge=1, le=20)
    temperature: float = Field(default=0.2, ge=0.0, le=1.0)

    @validator('project_id')
    def validate_project_id(cls, v):
        if not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError('project_id must be alphanumeric with - or _')
        return v

class ExplainDOMRequest(BaseModel):
    url: str = Field(..., max_length=2000)
    html: str = Field(..., max_length=100000)
    classes: List[str] = Field(default_factory=list)
    tag: str = Field(..., max_length=50)
    css_rules: Optional[str] = None
    parent_context: Optional[str] = None

class ExplainResponse(BaseModel):
    explanation: str
    sources: Optional[List[str]] = None
    confidence: Optional[float] = None

class IngestResponse(BaseModel):
    status: str
    project_id: str
    chunks_indexed: int

class ProjectInfoResponse(BaseModel):
    project_id: str
    total_chunks: int
    last_indexed: Optional[str]
    indexed_files: int
