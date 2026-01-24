# TriAxisKernel Hash Ritual (Deterministic JCS + SHA-256)

## Overview
This document defines the deterministic hashing ritual for TriAxisKernel artifacts. Follow this procedure to compute component digests, transcript integrity, and the final artifact digest.

## Canonicalization Rules
- **Canonical form:** JSON Canonicalization Scheme (JCS, RFC 8785).
- **Whitespace:** none; rely on JCS byte ordering.
- **Field ordering:** JCS canonical ordering (lexicographic by Unicode code points).
- **Number formatting:** plain JSON numbers (no unnecessary trailing zeros).
- **Timestamps:** ISO-8601 UTC strings unchanged.
- **Transcript exclusions:** when computing `transcript_digest`, exclude `attestation.signature` and `transcript_digest` itself.

## Hash Scopes
Compute SHA-256 over the JCS bytes of each scope:

- **ShapeProgram.v1 digest**
  - Scope name: `ShapeProgram.v1`
  - Input: JCS(ShapeProgram object)
  - Output field: `TriAxisKernel.components[ShapeProgram].integrity.digest`

- **AgentPlane.v1 digest**
  - Scope name: `AgentPlane.v1`
  - Input: JCS(AgentPlane object)
  - Output field: `TriAxisKernel.components[AgentPlane].integrity.digest`

- **Initial state hash**
  - Scope name: `InitialState`
  - Input: JCS(initial_state object from AgentPlane)
  - Output field: `ReplayCourt.initial_state_hash`

- **Control sequence hash**
  - Scope name: `ControlSequence`
  - Input: JCS(control_sequence array from AgentPlane.proposal)
  - Output field: `ReplayCourt.control_sequence_hash`

- **Per-tick state hashes**
  - Scope name: `StateSnapshot_i` for each tick `i`
  - Input: JCS(state_snapshot_i)
  - Output: `state_hashes[i]` in `DeterminismTranscript.v1`

- **Merkle root**
  - Build a binary Merkle tree over `state_hashes[]` (use raw 32-byte binary values in canonical order), compute the SHA-256 root, encode as `sha256:<hex64>`.

- **Full transcript digest**
  - Scope name: `DeterminismTranscript`
  - Input: JCS(full transcript object) excluding `transcript_digest` and `attestation.signature`
  - Output field: `transcript_digest`

- **TriAxisKernel full artifact digest**
  - Scope name: `TriAxisKernel.FULL_ARTIFACT`
  - Input: JCS(full TriAxisKernel envelope after inserting component digests and transcript hash)
  - Output field: `TriAxisKernel.integrity.digest`

## Example Commands
Use a JCS tool (or library) to canonicalize, then compute SHA-256.

```bash
# 1. Canonicalize ShapeProgram
cat shapeprogram.json | jcs > shapeprogram.jcs
sha256sum shapeprogram.jcs | awk '{print $1}'  # yields hex64

# 2. Canonicalize AgentPlane
cat agentplane.json | jcs > agentplane.jcs
sha256sum agentplane.jcs | awk '{print $1}'

# 3. Canonicalize initial state and control sequence
cat initial_state.json | jcs > initial_state.jcs
sha256sum initial_state.jcs | awk '{print $1}'

cat control_sequence.json | jcs > control_sequence.jcs
sha256sum control_sequence.jcs | awk '{print $1}'

# 4. Per-tick snapshots
for i in $(seq 0 $((TICKS-1))); do
  cat state_snapshot_$i.json | jcs > state_$i.jcs
  sha256sum state_$i.jcs | awk '{print $1}' >> state_hashes.txt
done

# 5. Build Merkle root
python3 - <<'PY'
import hashlib

with open('state_hashes.txt') as f:
    leaves = [bytes.fromhex(l.strip()) for l in f]

if not leaves:
    raise SystemExit('No state hashes provided.')

while len(leaves) > 1:
    if len(leaves) % 2:
        leaves.append(leaves[-1])
    leaves = [hashlib.sha256(a + b).digest() for a, b in zip(leaves[0::2], leaves[1::2])]

print(leaves[0].hex())
PY

# 6. Assemble transcript.json (exclude transcript_digest and signature), canonicalize, hash
cat transcript_partial.json | jcs > transcript_partial.jcs
sha256sum transcript_partial.jcs | awk '{print $1}'
```

## Insertion Order and Finalization
1. Compute component digests and insert them into the TriAxisKernel envelope at the `__COMPUTE_OVER_*__` placeholders.
2. Compute per-tick `state_hashes[]` and `merkle_root`; insert into `DeterminismTranscript.v1`.
3. Canonicalize the transcript (without signature), compute `transcript_digest`, insert it.
4. Produce attestation signature over `transcript_digest` using the authorized signer; insert into `attestation.signature`.
5. Canonicalize the full TriAxisKernel envelope (containing all component digests and the transcript digest), compute `TriAxisKernel.integrity.digest`.
6. Store the finalized artifact and transcript in Golden S3 with indexing keys:
   - `(kernel_version.binary_digest, seed_domain.seed_value, input_capsule_ref.digest, transcript_digest)`

## DeterminismTranscript.v1 Extractor Ritual (Verification Checklist)
Use this checklist to validate a produced artifact and transcript deterministically.

1. **Input integrity**: confirm you have the exact `ShapeProgram`, `AgentPlane`, `DeterminismTranscript`, and TriAxisKernel envelope intended for verification.
2. **Canonicalization rules**: verify JCS compliance, and ensure the transcript hash excludes `attestation.signature` and `transcript_digest`.
3. **Component digests**:
   - Recompute `ShapeProgram.v1` and `AgentPlane.v1` digests.
   - Compare them to the values in `TriAxisKernel.components[*].integrity.digest`.
4. **ReplayCourt hashes**:
   - Recompute `initial_state_hash` from `AgentPlane.initial_state`.
   - Recompute `control_sequence_hash` from `AgentPlane.proposal.control_sequence`.
   - Compare them with the `ReplayCourt` fields.
5. **Per-tick verification**:
   - Recompute every `state_hashes[i]` from the corresponding `state_snapshot_i`.
   - Ensure the array order is canonical tick order.
6. **Merkle root**:
   - Build the binary Merkle tree over the raw 32-byte state hashes.
   - Confirm the resulting `merkle_root` matches the transcript.
7. **Transcript digest**:
   - Canonicalize the transcript without `attestation.signature` and `transcript_digest`.
   - Recompute `transcript_digest` and compare with the recorded value.
8. **Attestation signature**:
   - Verify the signature over `transcript_digest` using the authorized signer.
9. **Full artifact digest**:
   - Canonicalize the full TriAxisKernel envelope (with inserted component digests and transcript digest).
   - Recompute `TriAxisKernel.integrity.digest` and compare.
10. **Outcome**:
    - If all checks match, the artifact is deterministic and replay-safe.
    - If any check fails, reject fossilization and emit a failure report with the mismatched scope.

## Example Envelope Template
Replace `<hex>` markers with computed hex64 values prefixed by `sha256:`.

```json
{
  "artifact_id": "TriAxisKernel_Worldline_0001",
  "schema_version": "TriAxisKernel.v1",
  "integrity": {
    "hash_algorithm": "SHA-256",
    "scope": "FULL_ARTIFACT",
    "digest": "sha256:<TRIAXIS_FULL_DIGEST_HEX>"
  },
  "components": [
    {
      "scope": "ShapeProgram.v1",
      "digest": "sha256:<SHAPEPROGRAM_HEX>"
    },
    {
      "scope": "AgentPlane.v1",
      "digest": "sha256:<AGENTPLANE_HEX>"
    },
    {
      "scope": "ReplayCourt.v1",
      "initial_state_hash": "sha256:<INITIAL_STATE_HEX>",
      "control_sequence_hash": "sha256:<CONTROL_SEQUENCE_HEX>",
      "transcript_digest": "sha256:<TRANSCRIPT_DIGEST_HEX>"
    }
  ]
}
```
