import json
import hashlib
from typing import Any, Dict

def canonicalize(data: Dict[str, Any]) -> bytes:
    """
    Implements a subset of JCS (JSON Canonicalization Scheme - RFC 8785).
    - Keys are sorted lexicographically.
    - No whitespace between keys/values.
    - UTF-8 encoding.
    """
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")

def compute_hash(data: Dict[str, Any]) -> str:
    """
    Computes the SHA-256 hash of the canonicalized JSON data.
    """
    canonical_bytes = canonicalize(data)
    return hashlib.sha256(canonical_bytes).hexdigest()
