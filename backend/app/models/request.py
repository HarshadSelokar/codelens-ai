from pydantic import BaseModel

class ExplainRequest(BaseModel):
    code: str
    language: str = "unknown"
