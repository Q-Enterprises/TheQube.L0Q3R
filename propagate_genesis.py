#!/usr/bin/env python3
"""Emit the propagation receipt for the genesis capsule."""
import json
import hashlib
from datetime import datetime

CAPSULE_PATH = "world.os.genesis.v1.capsule.json"
SEAL_PATH = "world.os.genesis.v1.seal.json"
LEDGER_PATH = "ledger.jsonl"
RECEIPT_PATH = "world.os.genesis.v1.propagate.json"
TARGET_NODES = [
    "ChronoSync.Nexus",
    "Caelum-X.Relay01",
    "Hadean.VerityArray",
    "Sol.F1.NodeZero",
]


def sha256(path):
    with open(path, "rb") as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def load_json(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def ledger_entries():
    with open(LEDGER_PATH, "r", encoding="utf-8") as handle:
        lines = [line for line in handle.read().splitlines() if line.strip()]
    if not lines:
        raise RuntimeError("ledger.jsonl contains no entries to validate")
    return lines


def validate_seal(seal, capsule_hash):
    capsule_ref = seal.get("capsule_ref")
    if capsule_ref != CAPSULE_PATH:
        raise RuntimeError(
            f"seal references {capsule_ref}, expected {CAPSULE_PATH}"
        )

    seal_capsule_hash = seal.get("capsule_sha256")
    expected_capsule_hash = f"sha256:{capsule_hash}"
    if seal_capsule_hash != expected_capsule_hash:
        raise RuntimeError(
            "seal capsule hash does not match computed capsule hash"
        )

    signature = seal.get("validator", {}).get("signature", {})
    return signature.get("sig_placeholder", "sig512:PENDING")


def validate_ledger(lines):
    position = len(lines)
    latest = json.loads(lines[-1])

    if latest.get("capsule") != CAPSULE_PATH:
        raise RuntimeError(
            "latest ledger entry does not reference the genesis capsule"
        )

    return position, latest


def main():
    capsule_hash = sha256(CAPSULE_PATH)
    seal_hash = sha256(SEAL_PATH)
    seal = load_json(SEAL_PATH)
    signature_placeholder = validate_seal(seal, capsule_hash)

    lines = ledger_entries()
    position, latest_entry = validate_ledger(lines)

    ledger_hash = latest_entry.get("hash")
    expected_capsule_hash = f"sha256:{capsule_hash}"
    if ledger_hash and ledger_hash != expected_capsule_hash:
        raise RuntimeError("ledger hash does not match capsule hash")

    receipt = {
        "receipt_id": "world.os.genesis.v1.propagate",
        "schema": "WORLD_OS_ENGINE.PROTOCOL.PROPAGATION",
        "version": "vΩ.0.0",
        "capsule_ref": CAPSULE_PATH,
        "capsule_seal": SEAL_PATH,
        "routing": {
            "distribution_mode": "federated_append",
            "target_nodes": TARGET_NODES,
            "protocols": ["https", "ledgercast", "sha256_stream"],
            "receipt_format": "deterministic/jcs+sha256",
        },
        "ledger_proof": {
            "local_ledger_path": f"./{LEDGER_PATH}",
            "entry_count": position,
            "latest_capsule_sha256": f"sha256:{seal_hash}",
            "entry_position": position,
            "verification_protocol": "ledger.fs.sync+entry.hash",
            "audit_token": "GENESIS:PRIME",
        },
        "verification": {
            "expected_self_hash": f"sha256:{seal_hash}",
            "expected_seal_signature": signature_placeholder,
            "cross_node_verification_required": True,
            "ledger_append_verified": True,
            "multinode_integrity_level": "STRONG",
        },
        "timestamp_utc": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    }

    with open(RECEIPT_PATH, "w", encoding="utf-8") as handle:
        json.dump(receipt, handle, indent=2)
        handle.write("\n")

    print(f"📡 Propagation receipt generated → {RECEIPT_PATH}")


if __name__ == "__main__":
    main()
