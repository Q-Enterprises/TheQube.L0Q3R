FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create dummy lib/schemas modules if they don't exist yet
RUN mkdir -p lib schemas && touch lib/__init__.py schemas/__init__.py

COPY . .

CMD ["rq", "worker", "embed", "--url", "$REDIS_URL"]
