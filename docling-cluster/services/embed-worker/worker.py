import logging
import time

logging.basicConfig(level=logging.INFO)

def process_embedding(doc_data):
    """
    Mock embedding function.
    In a real scenario, this would generate embeddings and upsert to Qdrant.
    """
    logging.info(f"Generating embeddings for document data...")
    time.sleep(1) # Simulate work
    return {"status": "success", "embeddings_count": 10}
