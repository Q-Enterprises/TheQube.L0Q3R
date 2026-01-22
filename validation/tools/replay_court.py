"""Replay-court verification utilities (StableStringify-aligned)."""

import hashlib
import json
import yaml


def canonicalize_jcs(data: dict) -> str:
    """Implements JSON Canonicalization Scheme (RFC 8785) for YAML objects."""
    return json.dumps(data, sort_keys=True, separators=(",", ":"))


def verify_fossil(path_to_yaml: str) -> bool:
    """Verifies the integrity of a fossil artifact against its digest."""
    with open(path_to_yaml, "r") as f:
        artifact = yaml.safe_load(f) or {}

    if "digest" not in artifact:
        raise ValueError("Artifact is missing required digest field.")

    provided_digest = artifact["digest"]
    artifact_body = {key: value for key, value in artifact.items() if key != "digest"}
    computed_digest = hashlib.sha256(canonicalize_jcs(artifact_body).encode()).hexdigest()

    return provided_digest == computed_digest


if __name__ == "__main__":
    raise SystemExit("Use verify_fossil() from another module or a REPL.")
