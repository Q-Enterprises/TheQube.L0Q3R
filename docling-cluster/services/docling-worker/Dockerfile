FROM python:3.10-slim

# Install system dependencies required for CV/Docling
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*


WORKDIR /app

COPY services/docling-worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create dummy lib/schemas modules if they don't exist yet, as they are mounted
RUN mkdir -p lib schemas && touch lib/__init__.py schemas/__init__.py

COPY . .

CMD ["rq", "worker", "docling", "--url", "$REDIS_URL"]
