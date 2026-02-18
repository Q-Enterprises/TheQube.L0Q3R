# Capsule Docking Shell v0.1.0-alpha

This document defines the capsule docking socket for the Deterministic Execution Plane (DEP), including:
- capsule docking shell schema (JSON-LD + JSON Schema)
- docking event spec (JSON-LD + JSON Schema)
- CapsuleModule class (reference implementation)
- DEP → Capsule binding contract
- Manifold Validator
- H3 (Triple-Hash Harmonic) verifier
- Agent Skeleton spec

## 1) Capsule Docking Shell Schema (JSON-LD)
**Artifact ID:** `adk://schema/capsule_docking_shell.v0.1.0-alpha`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "adk://schema/capsule_docking_shell.v0.1.0-alpha",
  "title": "Capsule Docking Shell",
  "type": "object",
  "additionalProperties": false,
  "@context": {
    "@vocab": "adk://vocab/",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "capsule_ref": { "@type": "@id" },
    "foundation_ref": { "@type": "@id" },
    "model_ref": { "@type": "@id" },
    "h_static": "xsd:string",
    "h_temporal": "xsd:string",
    "h_actuator": "xsd:string",
    "hirr_target": "xsd:number",
    "manifold_status": "xsd:string",
    "docking_status": "xsd:string",
    "constraints": { "@type": "@id" },
    "safety_envelope": { "@type": "@id" }
  },
  "required": [
    "capsule_ref",
    "foundation_ref",
    "model_ref",
    "h_static",
    "h_temporal",
    "h_actuator",
    "constraints",
    "safety_envelope"
  ],
  "properties": {
    "capsule_ref": {
      "type": "string",
      "pattern": "^adk://capsule/"
    },
    "foundation_ref": {
      "type": "string",
      "pattern": "^adk://foundation/"
    },
    "model_ref": {
      "type": "string",
      "pattern": "^adk://model/"
    },
    "h_static": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "description": "Immutable geometry + version hash"
    },
    "h_temporal": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "description": "Runtime config + replay parameters hash"
    },
    "h_actuator": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "description": "LoRA/PEFT influence hash"
    },
    "constraints": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "manifold": { "type": "string" },
        "allowed_region": { "type": "string" },
        "forbidden_region": { "type": "string" }
      }
    },
    "safety_envelope": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "max_velocity": { "type": "number" },
        "max_torque": { "type": "number" },
        "max_accel": { "type": "number" }
      }
    }
  }
}
```

## 2) Capsule Docking Event Spec (JSON-LD)
**Artifact ID:** `adk://event/capsule_docking.v0.1.0-alpha`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "adk://event/capsule_docking.v0.1.0-alpha",
  "title": "Capsule Docking Event",
  "type": "object",
  "additionalProperties": false,
  "@context": {
    "@vocab": "adk://vocab/",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "event_type": "xsd:string",
    "timestamp_ms": "xsd:integer",
    "capsule_ref": { "@type": "@id" },
    "foundation_ref": { "@type": "@id" },
    "model_ref": { "@type": "@id" },
    "triple_hash": { "@type": "@id" },
    "manifold_status": "xsd:string",
    "docking_status": "xsd:string",
    "reason": "xsd:string"
  },
  "required": [
    "event_type",
    "timestamp_ms",
    "capsule_ref",
    "foundation_ref",
    "model_ref",
    "triple_hash",
    "docking_status"
  ],
  "properties": {
    "event_type": { "const": "CAPSULE_DOCKING" },
    "timestamp_ms": { "type": "integer" },
    "capsule_ref": { "type": "string" },
    "foundation_ref": { "type": "string" },
    "model_ref": { "type": "string" },
    "triple_hash": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "h_static": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
        "h_temporal": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
        "h_actuator": { "type": "string", "pattern": "^[a-f0-9]{64}$" }
      }
    },
    "manifold_status": {
      "type": "string",
      "enum": ["INSIDE_BOUNDS", "OUT_OF_BOUNDS"]
    },
    "docking_status": {
      "type": "string",
      "enum": ["ACCEPT", "REJECT"]
    },
    "reason": {
      "type": "string",
      "maxLength": 512
    }
  }
}
```

## 3) CapsuleModule (reference implementation)

```python
from dataclasses import dataclass
from typing import Any, Dict, Optional


class DockingError(RuntimeError):
    pass


@dataclass(frozen=True)
class CapsuleModule:
    capsule_ref: str
    foundation_ref: str
    model_ref: str
    triple_hash: Dict[str, str]
    constraints: Dict[str, Any]
    safety_envelope: Dict[str, Any]
    manifest: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None

    def to_runtime_descriptor(self) -> Dict[str, Any]:
        return {
            "capsule_ref": self.capsule_ref,
            "foundation_ref": self.foundation_ref,
            "model_ref": self.model_ref,
            "triple_hash": self.triple_hash,
            "constraints": self.constraints,
            "safety_envelope": self.safety_envelope,
            "manifest": self.manifest,
            "metadata": self.metadata or {},
        }
```

## 4) DEP → Capsule Binding Contract

**Contract ID:** `adk://contract/dep_capsule_binding.v0.1.0-alpha`

**Required inputs:**
- `dock_shell`: capsule docking shell document (schema-conformant)
- `capsule_manifest`: capsule payload manifest (capsule-provided)
- `foundation_manifest`: immutable substrate manifest
- `model_manifest`: LoRA/PEFT influence manifest
- `registry`: trusted registry for resolving `*_ref` URIs

**Binding steps (deterministic, fail-closed):**
1. Resolve `capsule_ref`, `foundation_ref`, `model_ref` using `registry`.
2. Validate docking shell JSON against the docking shell schema.
3. Validate manifests against their respective schemas.
4. Verify triple-hash harmonic (`h_static`, `h_temporal`, `h_actuator`).
5. Enforce manifold constraints and safety envelope.
6. Emit `CAPSULE_DOCKING` event (`ACCEPT` or `REJECT`).
7. On accept, construct `CapsuleModule` and attach to agent skeleton.

**Failure semantics:**
- Any validation or verification failure MUST emit a `REJECT` docking event and MUST NOT return a `CapsuleModule`.

## 5) Manifold Validator

```python
def validate_manifold(shell: Dict[str, Any], model_manifest: Dict[str, Any]) -> Dict[str, str]:
    constraints = shell.get("constraints", {})
    allowed_region = constraints.get("allowed_region")
    forbidden_region = constraints.get("forbidden_region")

    model_region = model_manifest.get("region")
    if allowed_region and model_region != allowed_region:
        return {"status": "OUT_OF_BOUNDS", "reason": "MODEL_OUTSIDE_ALLOWED_REGION"}
    if forbidden_region and model_region == forbidden_region:
        return {"status": "OUT_OF_BOUNDS", "reason": "MODEL_IN_FORBIDDEN_REGION"}

    return {"status": "INSIDE_BOUNDS", "reason": "OK"}
```

## 6) H3 (Triple-Hash Harmonic) Verifier

```python
import hashlib
import json


def canonical_bytes(payload: Dict[str, Any]) -> bytes:
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return (serialized + "\n").encode("utf-8")


def sha256_hex(payload: Dict[str, Any]) -> str:
    return hashlib.sha256(canonical_bytes(payload)).hexdigest()


def verify_h3(shell: Dict[str, Any], capsule_manifest: Dict[str, Any], foundation_manifest: Dict[str, Any], model_manifest: Dict[str, Any]) -> bool:
    h_static_expected = shell.get("h_static")
    h_temporal_expected = shell.get("h_temporal")
    h_actuator_expected = shell.get("h_actuator")

    h_static_actual = sha256_hex(foundation_manifest)
    h_temporal_actual = sha256_hex(capsule_manifest)
    h_actuator_actual = sha256_hex(model_manifest)

    return (
        h_static_actual == h_static_expected
        and h_temporal_actual == h_temporal_expected
        and h_actuator_actual == h_actuator_expected
    )
```

## 7) Agent Skeleton Spec

**Artifact ID:** `adk://agent/agent_skeleton.v0.1.0-alpha`

**Required interfaces:**
- `dock(shell, capsule_manifest, foundation_manifest, model_manifest, registry) -> CapsuleModule`
- `emit_event(event: Dict[str, Any]) -> None`
- `load_capsule(module: CapsuleModule) -> None`

**Reference flow:**
1. `dock()` resolves references and validates schemas.
2. `dock()` verifies H3 and manifold constraints.
3. `dock()` emits `CAPSULE_DOCKING` event.
4. `dock()` returns `CapsuleModule` for execution.

**Minimal reference skeleton:**

```python
from typing import Any, Dict


def emit_docking_event(event: Dict[str, Any]) -> None:
    # Event sink is implementation-specific (log, event bus, audit ledger)
    pass


def dock(shell: Dict[str, Any], capsule_manifest: Dict[str, Any], foundation_manifest: Dict[str, Any], model_manifest: Dict[str, Any], registry: Dict[str, Any]) -> CapsuleModule:
    if not registry:
        raise DockingError("Registry unavailable")

    manifold_result = validate_manifold(shell, model_manifest)
    if manifold_result["status"] != "INSIDE_BOUNDS":
        emit_docking_event({
            "event_type": "CAPSULE_DOCKING",
            "timestamp_ms": 0,
            "capsule_ref": shell.get("capsule_ref"),
            "foundation_ref": shell.get("foundation_ref"),
            "model_ref": shell.get("model_ref"),
            "triple_hash": {
                "h_static": shell.get("h_static"),
                "h_temporal": shell.get("h_temporal"),
                "h_actuator": shell.get("h_actuator"),
            },
            "manifold_status": manifold_result["status"],
            "docking_status": "REJECT",
            "reason": manifold_result["reason"],
        })
        raise DockingError(manifold_result["reason"])

    if not verify_h3(shell, capsule_manifest, foundation_manifest, model_manifest):
        emit_docking_event({
            "event_type": "CAPSULE_DOCKING",
            "timestamp_ms": 0,
            "capsule_ref": shell.get("capsule_ref"),
            "foundation_ref": shell.get("foundation_ref"),
            "model_ref": shell.get("model_ref"),
            "triple_hash": {
                "h_static": shell.get("h_static"),
                "h_temporal": shell.get("h_temporal"),
                "h_actuator": shell.get("h_actuator"),
            },
            "manifold_status": "INSIDE_BOUNDS",
            "docking_status": "REJECT",
            "reason": "H3_MISMATCH",
        })
        raise DockingError("H3 mismatch")

    emit_docking_event({
        "event_type": "CAPSULE_DOCKING",
        "timestamp_ms": 0,
        "capsule_ref": shell.get("capsule_ref"),
        "foundation_ref": shell.get("foundation_ref"),
        "model_ref": shell.get("model_ref"),
        "triple_hash": {
            "h_static": shell.get("h_static"),
            "h_temporal": shell.get("h_temporal"),
            "h_actuator": shell.get("h_actuator"),
        },
        "manifold_status": "INSIDE_BOUNDS",
        "docking_status": "ACCEPT",
        "reason": "OK",
    })

    return CapsuleModule(
        capsule_ref=shell.get("capsule_ref"),
        foundation_ref=shell.get("foundation_ref"),
        model_ref=shell.get("model_ref"),
        triple_hash={
            "h_static": shell.get("h_static"),
            "h_temporal": shell.get("h_temporal"),
            "h_actuator": shell.get("h_actuator"),
        },
        constraints=shell.get("constraints", {}),
        safety_envelope=shell.get("safety_envelope", {}),
        manifest=capsule_manifest,
    )
```
