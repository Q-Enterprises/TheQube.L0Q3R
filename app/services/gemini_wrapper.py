import os
import json
import requests
import time
import random
from typing import Optional, List, Dict, Any, Union

# --- Configuration (ZERO_DRIFT Governance) ---
# The API key is sourced from environment variables for security.
GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
GEMINI_API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/"
DEFAULT_MODEL = "gemini-2.5-flash-preview-09-2025"
MAX_RETRIES = 5
INITIAL_BACKOFF_SECONDS = 2
JITTER_FACTOR = 0.1

# --- Exceptions ---
class GeminiAPIError(Exception):
    """Custom exception for Gemini API failures."""
    pass

class AuthError(GeminiAPIError): pass
class NetworkError(GeminiAPIError): pass
class GenerationFailed(GeminiAPIError): pass

def generate_content_with_gemini(
    prompt_text: str,
    model_name: str = DEFAULT_MODEL,
    system_instruction: Optional[str] = None,
    json_schema: Optional[Dict[str, Any]] = None,
    temperature: float = 0.5
) -> Dict[str, Any]:
    """
    Robust wrapper function to call the Gemini API via HTTP requests.

    This function implements core governance rules: explicit payload construction,
    exponential backoff for resilience, and structured JSON output via schema.


    Args:
        prompt_text: The primary input prompt.
        model_name: The model to use (defaults to gemini-2.5-flash-preview-09-2025).
        system_instruction: Optional instruction to guide the model's behavior/persona.
        json_schema: Optional JSON schema for forcing structured output.
        temperature: Controls randomness (0.0 to 1.0).

    Returns:
        A dictionary containing the 'text' (str) or 'json_output' (dict), and 'error' (Optional[str]).
    """
    if not GEMINI_API_KEY:
        return {"text": None, "error": "API Error: GOOGLE_API_KEY environment variable is not set."}

    url = f"{GEMINI_API_URL_BASE}{model_name}:generateContent?key={GEMINI_API_KEY}"

    # --- Constructing the Payload ---
    payload = {
        "contents": [{"parts": [{"text": prompt_text}]}],
        "config": {
            "temperature": temperature,
            "tools": [{"google_search": {}}] # Always enable grounding for the Nexus Core
        }
    }

    if system_instruction:
        # System instructions are added outside the contents array
        payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    if json_schema:
        payload["config"]["responseMimeType"] = "application/json"
        payload["config"]["responseSchema"] = json_schema

    # --- Exponential Backoff Logic (Zero-Drift Compliance) ---
    response = None
    for attempt in range(MAX_RETRIES):
        try:
            headers = {"Content-Type": "application/json"}
            response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=30)
            response.raise_for_status()

            data = response.json()
            candidate = data.get('candidates', [{}])[0]

            if not candidate:
                raise GenerationFailed("Model returned no candidate response.")

            # The content part handling must address the possibility of JSON or raw text
            content_parts = candidate.get('content', {}).get('parts', [{}])
            text = content_parts[0].get('text') if content_parts else None

            # Check for block reason
            if text is None:
                block_reason = candidate.get('finishReason')
                if block_reason in ['SAFETY', 'RECITATION', 'OTHER']:
                    return {"text": None, "error": f"Request blocked by safety policy: {block_reason}"}
                raise GeminiAPIError("Model returned empty text field (no output or internal error).")

            # If a schema was provided, attempt to parse the text as JSON
            if json_schema:
                try:
                    # Return the parsed object under 'json_output' key
                    return {"json_output": json.loads(text), "error": None}
                except json.JSONDecodeError:
                    raise GeminiAPIError("Failed to parse JSON output from model.")

            # Return raw text under 'text' key
            return {"text": text, "error": None}

        except requests.exceptions.Timeout:
            error_message = "Request timed out."
        except requests.exceptions.RequestException as e:
            error_message = f"Request failed: {e}"
            if response is not None:
                # Log detailed error information from the API response body
                error_message = f"HTTP Error {response.status_code}: {response.text}"
        except GeminiAPIError as e:
            error_message = f"Gemini Error: {e}"
        except Exception as e:
            error_message = f"Unexpected processing error: {e}"

        # --- Retry Logic ---
        if attempt < MAX_RETRIES - 1:
            # Use standard exponential backoff (2^attempt)
            wait_time = INITIAL_BACKOFF_SECONDS * (2 ** attempt) + random.uniform(0, JITTER_FACTOR)
            # print(f"[{model_name}] Attempt {attempt + 1} failed. Retrying in {wait_time:.2f}s...")
            time.sleep(wait_time)
        else:
            return {"text": None, "error": error_message}

    return {"text": None, "error": "Exceeded max retries."}

# Example Usage Block (Demonstrating structured output)
if __name__ == "__main__":
    system_prompt = "You are a CI/CD Policy Enforcer. Return policy decision strictly in JSON."

    policy_schema = {
        "type": "OBJECT",
        "properties": {
            "decision": {"type": "STRING", "enum": ["APPROVE", "REJECT", "AUDIT"]},
            "reason": {"type": "STRING"}
        },
        "required": ["decision", "reason"]
    }

    print("--- Nexus Core Causal Atomism Tool Test ---")

    try:
        if not os.environ.get("GOOGLE_API_KEY"):
            print("WARNING: API key not set. Cannot run live example.")
        else:
            prompt = "Should capsule V7.1 be deployed if audit_pass_rate is 0.98?"

            # Execute the call
            result = generate_content_with_gemini(
                prompt_text=prompt,
                system_instruction=system_prompt,
                json_schema=policy_schema
            )

            print("\n--- Policy Decision ---")
            if result["json_output"]:
                print(json.dumps(result["json_output"], indent=2))
            else:
                print(f"Error: {result['error']}")

    except GeminiAPIError as e:
        print(f"\nFATAL ERROR DURING TEST: {e}")
