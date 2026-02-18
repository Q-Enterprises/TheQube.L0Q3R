"""
Simple Ingest API Test Server - Demonstrates the RAG pipeline ingestion endpoint.
"""
import hashlib
import os
from datetime import datetime, timezone
from typing import Annotated

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from pydantic import BaseModel

app = FastAPI(
    title="RAG Ingest API (Test)",
    description="Document ingestion endpoint for testing",
    version="0.1.0"
)

class IngestResponse(BaseModel):
    """Response from document ingestion."""
    bundle_id: str
    doc_id: str
    status: str
    queued_at: str
    message: str

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    message: str

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        message="Ingest API is running (test mode - no workers connected)"
    )

@app.post("/ingest", response_model=IngestResponse)
async def ingest_document(
    file: Annotated[UploadFile, File(description="Document to ingest")],
    metadata: Annotated[str | None, Form()] = None
):
    """
    Ingest a document into the processing pipeline.
    
    In production, this would:
    1. Queue the document for parsing (docling-worker)
    2. Generate embeddings (embed-worker with batch processing)
    3. Store vectors in Qdrant
    4. Record in the sovereignty ledger
    """
    # Read file content
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    
    # Generate deterministic IDs
    content_hash = hashlib.sha256(content).hexdigest()
    doc_id = f"sha256:{content_hash}"
    bundle_id = f"bundle:{hashlib.sha256((doc_id + (file.filename or '')).encode()).hexdigest()[:16]}"
    
    now = datetime.now(timezone.utc).isoformat()
    
    # In production: enqueue to parse_queue via RQ
    # parse_queue.enqueue("worker.parse_document", job)
    
    return IngestResponse(
        bundle_id=bundle_id,
        doc_id=doc_id,
        status="queued",
        queued_at=now,
        message=f"Document '{file.filename}' received. In production, this would trigger: Docling parsing → Batch embedding (GPU) → Qdrant storage → Ledger signing"
    )

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting RAG Ingest API Test Server...")
    print("📍 Endpoint: http://localhost:8000/ingest")
    print("🏥 Health: http://localhost:8000/health")
    uvicorn.run(app, host="0.0.0.0", port=8000)
