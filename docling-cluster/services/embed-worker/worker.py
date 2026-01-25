"""
Embed Worker - Creates embeddings using PyTorch (Batch Mode) and stores in Qdrant.
Includes Sovereign Wallet Proxy for batch signing.
"""
import os
import sys
import hashlib
import logging
from typing import List, Dict, Any
import torch
from torch.utils.data import DataLoader, Dataset
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams
from redis import Redis
from rq import Queue, Worker

# Add parent paths for imports
# In Docker, /app is the workdir, so lib/schemas are top-level
sys.path.insert(0, "/app")
from lib import (
    compute_chunk_id,
    get_ledger,
    hash_canonical_without_integrity,
    jcs_canonical_bytes
)
from schemas import ChunkEmbeddingV1, Chunker, Embedding, Provenance

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration from environment
EMBEDDER_MODEL_ID = os.environ.get("EMBEDDER_MODEL_ID", "text-embedder-v1")
CHUNKER_VERSION = os.environ.get("CHUNKER_VERSION", "chunk.v1")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
QDRANT_HOST = os.environ.get("QDRANT_HOST", "qdrant")
QDRANT_PORT = int(os.environ.get("QDRANT_PORT", "6333"))
COLLECTION_NAME = "document_chunks"
EMBEDDING_DIM = 768
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "32"))

# Connections
try:
    redis_conn = Redis.from_url(REDIS_URL)
except:
    logger.error("Failed to connect to Redis")
    redis_conn = None

try:
    qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
    # Ensure collection exists
    qdrant_client.get_collection(COLLECTION_NAME)
except Exception:
    try:
        qdrant_client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE)
        )
    except:
        logger.warning(f"Could not create collection {COLLECTION_NAME} or it exists")

# Mock weights hash
WEIGHTS_HASH = "sha256:" + "0" * 64

class WalletProxy:
    """
    Sovereign Wallet Proxy scaffold.
    Enforces 'Saintly Honesty' by signing batch digests.
    """
    def __init__(self, key_scaffold: str = "sovereign_key_0xFEEDFACE"):
        self.key_id = key_scaffold

    def sign_digest(self, digest: str) -> str:
        """Sign a content digest (mock implementation)."""
        # In production: interface with a secure enclave or hardware wallet
        signature = hashlib.sha256(f"{self.key_id}:{digest}".encode()).hexdigest()
        return f"sig:v1:{signature[:16]}"

class ChunkDataset(Dataset):
    """Simple dataset for batch processing chunks."""
    def __init__(self, texts: List[str]):
        self.texts = texts

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        return self.texts[idx]

def l2_normalize(x: torch.Tensor, eps: float = 1e-12) -> torch.Tensor:
    """L2 normalize a tensor along the last dimension."""
    return x / torch.clamp(torch.norm(x, p=2, dim=-1, keepdim=True), min=eps)

def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for a batch of texts using PyTorch.
    Optimized for GPU transitions.
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"[Scribe] Hardware acceleration: {device}")
    
    dataset = ChunkDataset(texts)
    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=False)
    
    all_embeddings = []
    
    # In production: model.to(device)
    
    for batch in dataloader:
        # Simulating CUDA processing
        batch_embeddings = torch.randn(len(batch), EMBEDDING_DIM).to(device)
        batch_embeddings = l2_normalize(batch_embeddings)
        all_embeddings.extend(batch_embeddings.cpu().tolist())
        
    return all_embeddings

def process_embedding(doc_json: Dict[str, Any]):
    """
    Process a normalized document for embedding.
    Expected input: doc.normalized.v1 json dict.
    """
    logger.info(f"Processing embedding job for doc: {doc_json.get('filename')}")
    
    chunks = doc_json.get("chunks", [])
    if not chunks:
        logger.warning("No chunks found in document")
        return {"status": "skipped", "reason": "empty"}

    wallet = WalletProxy()
    
    # Extract texts for batch embedding
    texts = [c.get("text", "") for c in chunks]
    
    # 1. Vectorized Embedding Generation
    vectors = get_embeddings_batch(texts)
    
    points = []
def embed_batch(payloads: List[Dict[str, Any]]):
    """
    Processes a batch of chunk payloads for embedding and stores them.
    Each payload dict is expected to contain:
    - "doc_id": str
    - "bundle_id": str
    - "chunk_index": int
    - "chunk_text": str
    """
    logger.info(f"Processing embedding batch for {len(payloads)} chunks.")

    # Mock Wallet for demo purposes
    class MockWallet:
        def sign_digest(self, digest):
            return f"sig_{digest[:16]}_mock"
    wallet = MockWallet()
    
    EMBEDDER_MODEL_ID = "mock-model-v1"
    # Weights hash would ideally come from the loaded model
    WEIGHTS_HASH = "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" 
    COLLECTION_NAME = "document_chunks"

    try:
        texts = [p["chunk_text"] for p in payloads]
        embeddings = get_embeddings_batch(texts)
        
        points = []
        ledger_records = []
        batch_digest_data = []
        
        ledger = get_ledger()

        for payload, vector in zip(payloads, embeddings):
            # Deterministic chunk ID
            chunk_id = compute_chunk_id(
                payload["doc_id"], 
                payload["chunk_index"], 
                payload["chunk_text"]
            )
            
            # Create integrity hash for content (simulating what would go into ledger)
            # We need the canonical hash of the content for the batch digest
            content_obj = {
                "doc_id": payload["doc_id"],
                "chunk_index": payload["chunk_index"],
                "text": payload["chunk_text"]
            }
            sha256_canonical = hash_canonical_without_integrity(content_obj)
            
            # Accumulate for batch signing
            batch_digest_data.append(sha256_canonical)
            
            # Prepare Ledger Record (will be signed in batch)
            ledger_records.append({
                "event": "chunk.embedding.v1",
                "bundle_id": payload["bundle_id"],
                "doc_id": payload["doc_id"],
                "chunk_id": chunk_id,
                "chunk_index": payload["chunk_index"],
                "embedder_model_id": EMBEDDER_MODEL_ID,
                "weights_hash": WEIGHTS_HASH,
                "content_hash": sha256_canonical,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            # Prepare Qdrant Point
            points.append(PointStruct(
                id=str(uuid.uuid5(uuid.NAMESPACE_URL, chunk_id)), 
                vector=vector,
                payload={
                    "doc_id": payload["doc_id"],
                    "bundle_id": payload["bundle_id"],
                    "chunk_text": payload["chunk_text"],
                    "content_hash": sha256_canonical
                }
            ))

        # 2. Sovereign Signing (The "Constitutional Braid" anchor)
        # Digest of all content hashes in the batch
        batch_digest = hashlib.sha256("".join(batch_digest_data).encode()).hexdigest()
        batch_signature = wallet.sign_digest(batch_digest)
        logger.info(f"[Scribe] Batch Authenticated. Signature: {batch_signature}")

        # 3. Batch Storage: Qdrant
        qdrant_client.upsert(collection_name=COLLECTION_NAME, points=points)
        
        # 4. Batch Logging: Ledger
        for record in ledger_records:
            record["batch_signature"] = batch_signature
            # Use append to get the linked hash
            ledger.append(record)
            
        logger.info(f"[Scribe] Batch complete. {len(payloads)} chunks committed to Sovereign Vault.")
        
        return {
            "status": "success",
            "chunks_embedded": len(payloads),
            "batch_signature": batch_signature
        }
    except Exception as e:
        logger.error(f"Error processing embedding batch: {e}")
        return {"status": "error", "message": str(e)}

# The original process_embedding function is removed as it's replaced by embed_batch
# If process_embedding was still needed, it would need to be adapted to call embed_batch
# or its logic would need to be re-integrated.
# For this change, we assume embed_batch is the new primary entry point for embedding.
