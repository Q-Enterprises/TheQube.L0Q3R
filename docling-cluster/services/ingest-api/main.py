import os
import shutil
from fastapi import FastAPI, File, UploadFile, HTTPException
from redis import Redis
from rq import Queue
import uvicorn
import logging

app = FastAPI(title="Docling Ingest API")

# Configuration
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
UPLOAD_DIR = "/tmp/uploads"

# Setup Redis Queue
try:
    redis_conn = Redis.from_url(REDIS_URL)
    q = Queue("docling", connection=redis_conn)
except Exception as e:
    logging.error(f"Failed to connect to Redis: {e}")
    redis_conn = None
    q = None

os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/health")
def health_check():
    redis_status = "down"
    if redis_conn:
        try:
            redis_conn.ping()
            redis_status = "up"
        except:
            pass
    return {"status": "ok", "redis": redis_status}

@app.post("/ingest")
async def ingest_document(file: UploadFile = File(...)):
    if not q:
        raise HTTPException(status_code=503, detail="Queue service unavailable")
    
    file_location = f"{UPLOAD_DIR}/{file.filename}"
    try:
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Enqueue job
    job = q.enqueue("worker.process_document", file_location, job_timeout="10m")
    
    return {
        "status": "queued",
        "job_id": job.id,
        "filename": file.filename
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
