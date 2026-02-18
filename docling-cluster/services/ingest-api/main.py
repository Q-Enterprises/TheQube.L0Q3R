"""
Ingest API - FastAPI service for document ingestion.

Accepts documents via POST, generates bundle_id, and publishes to parse_queue.
"""

import hashlib
import uuid
import logging
from datetime import datetime, timezone
from typing import Annotated

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import redis

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ingest-api")

app = FastAPI(
    title="Docling Ingest API",
    description="Document ingestion endpoint for the Docling normalization pipeline",
    version="0.1.0"
)

# Redis connection (configured via env vars in production)
REDIS_URL = "redis://localhost:6379"
# Try/except block handled in startup event
redis_client: redis.Redis | None = None


class IngestResponse(BaseModel):
    """Response from document ingestion."""
    bundle_id: str
    doc_id: str
    status: str
    queued_at: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    redis: str


@app.on_event("startup")
async def startup_event():
    """Initialize Redis connection on startup."""
    global redis_client
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        redis_client.ping()
        logger.info("Connected to Redis")
    except redis.ConnectionError as e:
        logger.warning(f"Redis not available: {e}")
        redis_client = None


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for Kubernetes probes."""
    redis_status = "connected"
    if redis_client is None:
        redis_status = "disconnected"
    else:
        try:
            redis_client.ping()
        except redis.ConnectionError:
            redis_status = "error"
    
    return HealthResponse(status="ok", redis=redis_status)


@app.post("/ingest", response_model=IngestResponse)
async def ingest_document(
    file: Annotated[UploadFile, File(description="Document to ingest (PDF, DOCX, etc.)")],
    metadata: Annotated[str | None, Form()] = None
):
    """
    Ingest a document into the processing pipeline.
    
    1. Generate deterministic IDs (doc_id, bundle_id)
    2. Store file temporarily
    3. Publish parse job to queue
    """
    if redis_client is None:
        raise HTTPException(status_code=503, detail="Queue service unavailable")
    
    # Read file content
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    
    # Generate deterministic IDs (enables replay testing)
    content_hash = hashlib.sha256(content).hexdigest()
    doc_id = f"sha256:{content_hash}"
    # Deterministic bundle_id: hash of doc_id + filename for replay determinism
    bundle_id = f"bundle:{hashlib.sha256((doc_id + (file.filename or '')).encode()).hexdigest()[:16]}"
    
    # Prepare job payload
    now = datetime.now(timezone.utc).isoformat()
    job = {
        "bundle_id": bundle_id,
        "doc_id": doc_id,
        "filename": file.filename,
        "content_type": file.content_type or "application/octet-stream",
        "size_bytes": len(content),
        "metadata": metadata,
        "received_at": now,
        # In a real system, we'd upload 'content' to S3 and pass the key.
        # For this demo/local setup, we might need a shared volume or pass small content inline.
        # Passing inline for simplicity in this demo (be careful with large files in Redis).
        # "content_b64": ... (omitted for now, assuming worker can access/download)
    }
    
    # Publish to parse queue
    redis_client.lpush("parse_queue", str(job))
    logger.info(f"Queued job: {bundle_id} for doc {doc_id}")
    
    return IngestResponse(
        bundle_id=bundle_id,
        doc_id=doc_id,
        status="queued",
        queued_at=now
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
