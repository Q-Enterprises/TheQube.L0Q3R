import logging
import os
import json
import hashlib
from redis import Redis
from rq import Queue
from docling.document_converter import DocumentConverter
from lib.ledger import get_ledger
from lib.canonical import compute_hash
from schemas.doc_normalized_v1 import DocNormalizedV1, Chunk

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Config
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
OUTPUT_DIR = "/app/data/normalized" # Shared volume path
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Connections
try:
    redis_conn = Redis.from_url(REDIS_URL)
    q_embed = Queue("embed", connection=redis_conn)
except:
    logger.error("Failed to connect to Redis")
    q_embed = None

def get_file_hash(file_path):
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def process_document(file_path):
    """
    Real Docling processing:
    1. Parse PDF
    2. Normalize
    3. Ledger Record
    4. Enqueue Embed
    """
    logger.info(f"Starting processing for: {file_path}")
    ledger = get_ledger()

    try:
        # 1. Compute Source Hash
        source_hash = get_file_hash(file_path)
        
        # 2. Convert with Docling
        converter = DocumentConverter()
        result = converter.convert(file_path)
        doc = result.document

        # 3. Normalize into Canonical Schema
        chunks = []
        for item in doc.texts:
            # Simple chunking by text element for now
            # In a real app, you might merge paragraphs
            chunk = Chunk(
                text=item.text,
                page_number=item.page_no,
                bbox=item.bbox.as_tuple() if item.bbox else None
            )
            chunks.append(chunk)

        normalized_doc = DocNormalizedV1(
            filename=os.path.basename(file_path),
            source_hash=source_hash,
            chunks=chunks,
            metadata={"page_count": doc.num_pages}
        )
        
        doc_json = normalized_doc.model_dump()

        # 4. Ledger Entry
        ledger.record_entry("doc_normalized", {
            "source_hash": source_hash,
            "chunk_count": len(chunks)
        })
        
        # 5. Save to Disk (simulating localized object storage)
        output_file = f"{OUTPUT_DIR}/{source_hash}.json"
        with open(output_file, "w") as f:
            json.dump(doc_json, f)

        # 6. Enqueue Embed Job
        if q_embed:
            q_embed.enqueue("worker.process_embedding", doc_json, job_timeout="20m")
            logger.info(f"Enqueued embedding job including {len(chunks)} chunks")
        else:
            logger.warning("Embed queue not available, skipping join")

        return {"status": "success", "file": file_path, "chunks": len(chunks)}

    except Exception as e:
        logger.error(f"Processing failed: {e}")
        return {"status": "failed", "error": str(e)}
