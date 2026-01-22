# VaultAnchorWrite.v1 — API Spec (Deterministic / Replay-Safe / Fail-Closed)

## Purpose
Produce a vault-assigned anchor for an artifact payload, with deterministic:
- JCS canonicalization
- SHA-256 hashing
- Ed25519 signature verification
- Non-circular anchor hash (sealed receipt fossil)

This spec is designed for CI-grade replay and Replay-Court reconstruction.

---

## Terminology
- **JCS**: RFC8785 JSON Canonicalization Scheme
- **Canonical bytes**: UTF-8 bytes of JCS string **plus a final "\n"** (single LF)
- **payload_hash**: sha256(canonical_bytes(payload))
- **pre-anchor receipt**: receipt with `signature_base64=""` and `vault_anchor.sealed=false`, `vault_anchor.anchor_id=""`, `vault_anchor.anchor_hash=""`
- **final sealed receipt**: receipt with signature populated + vault assigns anchor fields

---

## Canonicalization Rules (CORRIDOR-CRITICAL)
1. Canonical JSON MUST be RFC8785 JCS.
2. Canonical bytes = `UTF8(JCS(obj)) + "\n"`.
3. No floats permitted in any hashed or signed surface.
4. Only JSON booleans `true/false` (not strings).
5. UTF-8 only. No BOM.
6. Field sets are closed (no extra fields beyond schema) in strict mode.

---

## Cryptographic Rules
### Hash
- `sha256_hex = SHA-256(canonical_bytes)`
- Represented as lowercase 64-hex.
- When serialized in JSON, use:
  - `payload_hash_sha256`: **hex only** (64-hex)
  - `anchor_hash`: **hex only** (64-hex)
  - (Optional external display may prefix `sha256:` but the canonical JSON fields are hex-only unless your schema explicitly says otherwise.)

### Signature (Ed25519)
- Signature is Ed25519 over **canonical bytes** of the signing surface.
- `signature_base64` encodes the 64-byte Ed25519 signature (base64, padded).
- Public key identity is bound via `pubkey_fingerprint = sha256(raw_pubkey_bytes)`.

---

## Request Schema (VaultAnchorWriteRequest.v1)

### Endpoint
`POST /v1/vault/anchor`

### Body
```json
{
  "schema": "VaultAnchorWriteRequest.v1",
  "artifact_kind": "TestPayload.v1",
  "payload": { "schema": "TestPayload.v1", "value": "hello-world" },
  "lineage": { "run_id": "run-test-0001" },
  "signers": [
    {
      "pubkey_fingerprint": "<64-hex>",
      "signature_base64": "<base64(sig over pre-anchor receipt canonical bytes)>"
    }
  ],
  "verifier_parity": { "node": true, "python": true }
}
```

### Signing Surface (what signers sign)

Signers MUST sign the **pre-anchor receipt** canonical bytes:

**Pre-anchor receipt object** (constructed by vault from request):

* `schema = "VaultFossilizationReceipt.v1"`
* `artifact_kind` from request
* `payload_hash_sha256` computed from payload
* `verifier_parity` from request (or computed; if computed, it MUST be deterministic)
* `signers[*].signature_base64 = ""` (empty string for signing surface)
* `lineage` from request
* `admissibility.status = "OK"` (vault fills after checks)
* `vault_anchor = { "anchor_id":"", "anchor_hash":"", "sealed": false }`

Then:

* canonicalize via JCS
* append "\n"
* sign bytes with Ed25519
* send signature_base64 in request

---

## Response Schema (VaultAnchorWriteResponse.v1)

```json
{
  "schema": "VaultAnchorWriteResponse.v1",
  "result": "SEALED",
  "receipt": {
    "schema": "VaultFossilizationReceipt.v1",
    "epoch": "RFC3339 timestamp (server policy)",
    "artifact_kind": "TestPayload.v1",
    "payload_hash_sha256": "<64-hex>",
    "verifier_parity": { "node": true, "python": true },
    "signers": [
      {
        "pubkey_fingerprint": "<64-hex>",
        "signature_base64": "<base64(64 bytes)>"
      }
    ],
    "lineage": { "run_id": "run-test-0001" },
    "admissibility": { "status": "OK" },
    "vault_anchor": {
      "anchor_id": "A00000000001",
      "anchor_hash": "<64-hex>",
      "sealed": true
    }
  }
}
```

---

## Non-Circular Anchor Hash Rule (REQUIRED)

To avoid self-reference:

1. Construct **final receipt for hashing** identical to the final sealed receipt, except:

* `vault_anchor.anchor_hash = ""` (empty string)

2. Compute:
   `anchor_hash = sha256( canonical_bytes(final_receipt_for_hash) )`

3. Write the final sealed receipt with:

* `vault_anchor.anchor_hash = <anchor_hash>`
* `vault_anchor.sealed = true`
* `vault_anchor.anchor_id = <assigned>`

---

## Admissibility Rules (fail-closed)

A request is admissible only if ALL are true:

1. `payload_hash_sha256` matches the hash of the provided payload under canonical rules.
2. Every signer entry:

   * fingerprint is 64-hex
   * signature_base64 decodes to exactly 64 bytes
3. The fingerprint maps to a known raw pubkey in the operator registry.
4. Ed25519 verifies over the exact pre-anchor receipt canonical bytes.
5. Field sets match schema exactly (strict mode).
6. No forbidden JSON types in hashed/signed surfaces (floats, NaN, Infinity).

If any check fails → do not assign an anchor id, do not seal.

---

## Error Surface (VaultAnchorWriteError.v1)

HTTP status codes are transport; the error body is deterministic:

```json
{
  "schema": "VaultAnchorWriteError.v1",
  "result": "REJECTED",
  "error_code": "E_SCHEMA | E_HASH_MISMATCH | E_UNKNOWN_SIGNER | E_SIG_INVALID | E_FORBIDDEN_TYPE | E_CANONICALIZE_FAIL",
  "details": {
    "path": "json.pointer.like./signers/0/signature_base64",
    "expected": "...",
    "observed": "..."
  }
}
```

No server timestamps are required in the error body.

---

## Replay-Court Reconstruction Contract

Given:

* request payload
* operator registry (pubkeys by fingerprint)
* the returned sealed receipt

A Replay Court MUST be able to deterministically reconstruct and verify:

1. payload_hash from payload
2. pre-anchor receipt signing surface (with signature_base64 empty, sealed=false, anchor fields empty)
3. Ed25519 signature verification
4. anchor_hash computed from final receipt with anchor_hash empty string
5. final receipt equals returned receipt once anchor_hash is filled

If any step differs, the receipt is non-canonical and must not be fossilized.
