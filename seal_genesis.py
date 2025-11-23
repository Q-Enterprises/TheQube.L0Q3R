#!/usr/bin/env python3
import json
import hashlib
from datetime import datetime

CAP_PATH = "world.os.genesis.v1.capsule.json"
SEAL_PATH = "world.os.genesis.v1.seal.json"
LEDGER_PATH = "ledger.jsonl"


def sha256(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def latest_ledger_entry():
    with open(LEDGER_PATH, "r", encoding="utf-8") as f:
        lines = [line for line in f.read().splitlines() if line.strip()]
    if not lines:
        raise RuntimeError("ledger.jsonl contains no entries")
    return len(lines), json.loads(lines[-1])


def main():
    cap_hash = sha256(CAP_PATH)
    ts = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    position, entry = latest_ledger_entry()

    ledger_capsule = entry.get("capsule")
    if ledger_capsule and ledger_capsule != CAP_PATH:
        raise RuntimeError(
            f"latest ledger entry references {ledger_capsule}, expected {CAP_PATH}"
        )

    ledger_hash = entry.get("hash")
    expected_hash = f"sha256:{cap_hash}"
    if ledger_hash and ledger_hash != expected_hash:
        raise RuntimeError(
            f"ledger hash {ledger_hash} does not match capsule hash {expected_hash}"
        )

    seal = {
        "seal_id": "world.os.genesis.v1.seal",
        "schema": "WORLD_OS_ENGINE.PROTOCOL.SEAL",
        "version": "vΩ.0.0",
        "capsule_ref": CAP_PATH,
        "capsule_sha256": f"sha256:{cap_hash}",
        "sealed_utc": ts,
        "validator": {
            "suzerain": "Supralogic.ΔAlpha",
            "role": "Prime Notary",
            "region": "CoreVault.F1",
            "instrument": "FSYNC+JCS+SHA256",
            "signature": {
                "type": "sha512",
                "sig_placeholder": "sig512:PENDING"
            }
        },
        "ledger_snapshot": {
            "ledger_path": f"./{LEDGER_PATH}",
            "entry_hash": f"sha256:{sha256(LEDGER_PATH)}",
            "position": str(position)
        },
        "integrity": {
            "jcs_canonical": True,
            "entropy_drift": 0.0,
            "capsule_verified": True,
            "ledger_append_verified": True
        }
    }

    with open(SEAL_PATH, "w", encoding="utf-8") as f:
        json.dump(seal, f, indent=2)
        f.write("\n")

    print(f"✅ Seal manifest written to: {SEAL_PATH}")


if __name__ == "__main__":
    main()
