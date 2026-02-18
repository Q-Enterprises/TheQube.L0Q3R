# TriAxis Kernel Hashing Ritual (Deterministic)

This guide defines the canonicalization rules, hash scopes, and reproducible commands for producing deterministic SHA-256 digests and Merkle roots used by TriAxis Kernel artifacts and transcripts.

## 1. Canonicalization Rules

- **Canonical form:** JSON Canonicalization Scheme (JCS, RFC 8785).
- **Whitespace:** none; use JCS byte ordering.
- **Field ordering:** JCS canonical ordering (lexicographic by Unicode code points).
- **Number formatting:** use plain JSON numbers (no trailing zeros beyond necessary).
- **Timestamps:** ISO-8601 UTC strings unchanged.
- **Excluded fields when hashing transcripts:** when computing `transcript_digest`, exclude `attestation.signature` and `transcript_digest` itself.

## 2. Hash Scopes

Compute each digest over **JCS bytes** of the named scope.

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
  - Output field: `state_hashes[i]` in `DeterminismTranscript.v1`

- **Merkle root**
  - Build a binary Merkle tree over `state_hashes[]` (raw 32-byte binary values in canonical order), compute SHA-256 root, encode as `sha256:<hex64>`.

- **Full transcript digest**
  - Scope name: `DeterminismTranscript`
  - Input: JCS(full transcript object) **excluding** `transcript_digest` and `attestation.signature`.
  - Output field: `transcript_digest`

- **TriAxisKernel full artifact digest**
  - Scope name: `TriAxisKernel.FULL_ARTIFACT`
  - Input: JCS(full TriAxisKernel envelope after inserting component digests and the transcript hash)
  - Output field: `TriAxisKernel.integrity.digest`

## 3. Reproducible Commands (Example)

Use a JCS tool (or library) to canonicalize, then compute SHA-256. Replace `jcs` with your canonicalizer.

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

# 5. Build Merkle root (example Python snippet)
python3 - <<'PY'
import hashlib

with open('state_hashes.txt') as f:
    leaves = [bytes.fromhex(line.strip()) for line in f]

def merkle_root(nodes):
    if len(nodes) == 1:
        return nodes[0]
    while len(nodes) > 1:
        if len(nodes) % 2:
            nodes.append(nodes[-1])
        nodes = [
            hashlib.sha256(a + b).digest()
            for a, b in zip(nodes[0::2], nodes[1::2])
        ]
    return nodes[0]

root = merkle_root(leaves)
print(root.hex())
PY

# 6. Assemble transcript.json (exclude transcript_digest and signature), canonicalize, hash
cat transcript_partial.json | jcs > transcript_partial.jcs
sha256sum transcript_partial.jcs | awk '{print $1}'
```

## 4. Insertion Order

1. Compute component digests and insert them into the TriAxisKernel envelope.
2. Compute per-tick `state_hashes[]` and `merkle_root`; insert into `DeterminismTranscript.v1`.
3. Canonicalize the transcript (without signature), compute `transcript_digest`, insert it.
4. Produce attestation signature over `transcript_digest` using the authorized signer; insert into `attestation.signature`.
5. Canonicalize the full TriAxisKernel envelope (now containing all component digests and the transcript digest), compute `TriAxisKernel.integrity.digest`.
6. Store the finalized artifact and transcript in Golden S3 with indexing keys:
   - `(kernel_version.binary_digest, seed_domain.seed_value, input_capsule_ref.digest, transcript_digest)`.

## 5. Final Envelope Template

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
