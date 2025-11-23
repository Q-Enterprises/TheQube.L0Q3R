import json
import time
import random
import http.client
import urllib.parse
from typing import Dict, Any, Optional

class GeminiError(Exception):
    """Base exception for Gemini wrapper errors."""
    pass

class AuthError(GeminiError):
    """Raised when authentication fails (non-recoverable)."""
    pass

class RetryableError(GeminiError):
    """Raised when the error is retryable."""
    pass

def generate_content_http(
    api_key: str,
    model: str,
    prompt: str,
    max_retries: int = 5,
    initial_backoff: float = 1.0,
    temperature: float = 0.7,
    response_schema: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generates content using the Gemini API via native HTTP client.

    Args:
        api_key: The Gemini API key.
        model: The model name (e.g., "gemini-1.5-pro").
        prompt: The input prompt.
        max_retries: Maximum number of retries for transient errors.
        initial_backoff: Initial backoff delay in seconds.
        temperature: Generation temperature.
        response_schema: Optional JSON schema for structured output.

    Returns:
        The JSON response from the API.

    Raises:
        AuthError: If the API key is invalid.
        GeminiError: For other errors after retries.
    """
    host = "generativelanguage.googleapis.com"
    path = f"/v1beta/models/{model}:generateContent?key={api_key}"

    headers = {
        "Content-Type": "application/json"
    }

    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": temperature
        }
    }

    if response_schema:
        payload["generationConfig"]["responseMimeType"] = "application/json"
        payload["generationConfig"]["responseSchema"] = response_schema

    json_payload = json.dumps(payload)

    for attempt in range(max_retries + 1):
        conn = http.client.HTTPSConnection(host)
        try:
            conn.request("POST", path, json_payload, headers)
            response = conn.getresponse()
            status = response.status
            data = response.read().decode("utf-8")

            if status == 200:
                try:
                    return json.loads(data)
                except json.JSONDecodeError:
                    raise GeminiError("Failed to decode JSON response")

            if status in (401, 403):
                raise AuthError(f"Authentication failed: {status} - {data}")

            if status in (429, 500, 503):
                if attempt < max_retries:
                    # Exponential backoff with jitter
                    sleep_time = (initial_backoff * (2 ** attempt)) + random.uniform(0, 1)
                    time.sleep(sleep_time)
                    continue
                else:
                    raise RetryableError(f"Max retries exceeded. Status: {status} - {data}")

            raise GeminiError(f"API request failed: {status} - {data}")

        except (http.client.HTTPException, OSError) as e:
            if attempt < max_retries:
                sleep_time = (initial_backoff * (2 ** attempt)) + random.uniform(0, 1)
                time.sleep(sleep_time)
                continue
            raise GeminiError(f"Network error: {str(e)}")
        finally:
            conn.close()

    raise GeminiError("Unknown error occurred")
