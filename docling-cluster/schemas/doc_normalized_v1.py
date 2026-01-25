from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class Chunk(BaseModel):
    text: str
    page_number: int
    bbox: Optional[List[float]] = None

class DocNormalizedV1(BaseModel):
    """
    Canonical Schema for a normalized document.
    """
    schema_version: str = "1.0.0"
    filename: str
    source_hash: str = Field(..., description="Hash of the original source file")
    chunks: List[Chunk]
    metadata: Dict[str, Any] = Field(default_factory=dict)
