#!/usr/bin/env python3
"""
BinaryCompileCheckpointCourt.v1
Constitutional validator for deterministic binary compilation
Status: REPLAY COURT GRADE 🜮
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, List

from validation.tools.replay_court import canonicalize_jcs


CHECKPOINT_SCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": [
        "schema_version",
        "timestamp_ns",
        "raw_binary_sha256",
        "staged_binary_sha256",
        "compiler",
        "build_env",
    ],
    "properties": {
        "schema_version": {"const": "BinaryCompileCheckpoint.v1"},
        "timestamp_ns": {"type": "integer"},
        "raw_binary_sha256": {"pattern": "^sha256:[0-9a-f]{64}$"},
        "staged_binary_sha256": {"pattern": "^sha256:[0-9a-f]{64}$"},
        "compiler": {
            "type": "object",
            "required": ["name", "version"],
            "properties": {
                "name": {"type": "string"},
                "version": {"type": "string"},
                "path_sha256": {"pattern": "^sha256:[0-9a-f]{64}$"},
            },
        },
        "build_env": {
            "type": "object",
            "required": ["os", "arch", "node_id"],
            "properties": {
                "os": {"type": "string"},
                "arch": {"type": "string"},
                "node_id": {"type": "string"},
            },
        },
    },
}


@dataclass
class BinaryCompileCheckpoint:
    """A. Constitutional Checkpoint"""

    schema_version: str = "BinaryCompileCheckpoint.v1"
    timestamp_ns: int | None = None
    raw_binary_sha256: str | None = None
    staged_binary_sha256: str | None = None
    compiler: Dict[str, str] | None = None
    build_env: Dict[str, str] | None = None
    inputs: List[Dict[str, str]] | None = None
    outputs: List[Dict[str, str]] | None = None

    def __post_init__(self) -> None:
        if self.timestamp_ns is None:
            self.timestamp_ns = time.time_ns()

    @classmethod
    def from_files(
        cls,
        raw_path: Path,
        staged_path: Path,
        compiler_info: Dict[str, str],
        build_env: Dict[str, str],
    ) -> "BinaryCompileCheckpoint":
        """Canonical factory: raw → staged → checkpoint"""
        raw_hash = f"sha256:{hashlib.sha256(raw_path.read_bytes()).hexdigest()}"
        staged_hash = f"sha256:{hashlib.sha256(staged_path.read_bytes()).hexdigest()}"

        return cls(
            raw_binary_sha256=raw_hash,
            staged_binary_sha256=staged_hash,
            compiler=compiler_info,
            build_env=build_env,
            inputs=[{"path": str(raw_path), "sha256": raw_hash}],
            outputs=[{"path": str(staged_path), "sha256": staged_hash}],
        )

    def canonical_json(self) -> str:
        """Deterministic serialization: sorted keys, canonical timestamps"""
        data = asdict(self)
        return canonicalize_jcs(data)


@dataclass
class BinaryCompileVerdict:
    """B. Constitutional Verdict"""

    schema_version: str = "BinaryCompileCheckpointVerdict.v1"
    timestamp_ns: int | None = None
    verdict: str | None = None
    reasons: List[str] | None = None
    verdict_hash: str | None = None
    checkpoint_hash: str | None = None

    def __post_init__(self) -> None:
        if self.timestamp_ns is None:
            self.timestamp_ns = time.time_ns()


class BinaryCompileCheckpointCourt:
    """C. Full Court: raw_binary → validator → checkpoint → MovieLedgerCapsule → CourtVerdict"""

    def __init__(self, ledger_path: Path = Path("movie_ledger.capsule")) -> None:
        self.ledger = ledger_path
        self.session_verdicts: List[BinaryCompileVerdict] = []

    def validate_checkpoint(
        self, checkpoint: BinaryCompileCheckpoint
    ) -> BinaryCompileVerdict:
        """R1+R2: Hash prefix + subfield enforcement"""
        reasons: List[str] = []
        checkpoint_json = checkpoint.canonical_json()
        checkpoint_hash = (
            f"sha256:{hashlib.sha256(checkpoint_json.encode()).hexdigest()}"
        )

        if checkpoint.schema_version != "BinaryCompileCheckpoint.v1":
            reasons.append("R1: Invalid schema_version")
            return BinaryCompileVerdict(
                verdict="INVALID", reasons=reasons, checkpoint_hash=checkpoint_hash
            )

        for hash_field in ["raw_binary_sha256", "staged_binary_sha256"]:
            value = checkpoint.__dict__.get(hash_field)
            if not value or not value.startswith("sha256:"):
                reasons.append(f"R1: {hash_field} missing sha256: prefix")
            elif len(value) != len("sha256:") + 64:
                reasons.append(f"R3: {hash_field} invalid length")
            else:
                digest = value.split("sha256:", 1)[1]
                if not all(char in "0123456789abcdef" for char in digest):
                    reasons.append(f"R3: {hash_field} non-hex digest")

        if not checkpoint.compiler or not all(
            key in checkpoint.compiler for key in ["name", "version"]
        ):
            reasons.append("R2: compiler missing name/version")
        if not checkpoint.build_env or not all(
            key in checkpoint.build_env for key in ["os", "arch", "node_id"]
        ):
            reasons.append("R2: build_env missing os/arch/node_id")

        if checkpoint.raw_binary_sha256 == checkpoint.staged_binary_sha256:
            reasons.append("Constitutional: raw == staged (no compilation occurred)")

        verdict = "VALID" if not reasons else "INVALID"
        verdict_json = {
            "verdict": verdict,
            "reasons": reasons,
            "checkpoint_hash": checkpoint_hash,
        }
        verdict_hash = (
            f"sha256:{hashlib.sha256(json.dumps(verdict_json, sort_keys=True).encode()).hexdigest()}"
        )

        return BinaryCompileVerdict(
            verdict=verdict,
            reasons=reasons,
            verdict_hash=verdict_hash,
            checkpoint_hash=checkpoint_hash,
        )

    def adjudicate(
        self,
        raw_path: Path,
        staged_path: Path,
        compiler_info: Dict[str, str],
        build_env: Dict[str, str],
    ) -> BinaryCompileVerdict:
        """Full court session: raw → checkpoint → verdict → ledger"""
        checkpoint = BinaryCompileCheckpoint.from_files(
            raw_path=raw_path,
            staged_path=staged_path,
            compiler_info=compiler_info,
            build_env=build_env,
        )

        verdict = self.validate_checkpoint(checkpoint)
        self.session_verdicts.append(verdict)

        capsule_entry = {
            "timestamp_ns": verdict.timestamp_ns,
            "checkpoint_hash": verdict.checkpoint_hash,
            "verdict": verdict.verdict,
            "verdict_hash": verdict.verdict_hash,
            "raw_binary": str(raw_path),
            "staged_binary": str(staged_path),
        }

        encoded = (json.dumps(capsule_entry) + "\n").encode("utf-8")
        fd = os.open(self.ledger, os.O_APPEND | os.O_CREAT | os.O_WRONLY, 0o644)
        try:
            with os.fdopen(fd, "ab") as handle:
                handle.write(encoded)
                handle.flush()
                os.fsync(handle.fileno())
        finally:
            try:
                os.close(fd)
            except OSError:
                pass

        return verdict


if __name__ == "__main__":
    court = BinaryCompileCheckpointCourt()

    verdict = court.adjudicate(
        raw_path=Path("adk-agent.raw"),
        staged_path=Path("adk-agent-gold-burn"),
        compiler_info={
            "name": "rustc",
            "version": "1.78.0",
            "path_sha256": "sha256:...",
        },
        build_env={"os": "linux", "arch": "x86_64", "node_id": "beelink-ser8-01"},
    )

    print(f"🜮 COURT VERDICT: {verdict.verdict}")
    print(f"Reasons: {verdict.reasons}")
    print(f"Capsule: {verdict.verdict_hash}")
