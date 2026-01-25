import logging
import time

logging.basicConfig(level=logging.INFO)

def process_document(file_path):
    """
    Mock processing function for Docling worker.
    In a real scenario, this would use docling to parse the PDF.
    """
    logging.info(f"Processing document: {file_path}")
    time.sleep(2) # Simulate work
    logging.info(f"Finished processing: {file_path}")
    return {"status": "success", "file": file_path, "pages": 5}
