# Loop0 Playable Checkpoint (Canvas Scaffold)

This folder hosts the Jurassic Pixels v0.6 runtime mock, keeping the demo split into an HTML shell and a React/Babel script for rapid iteration. The Loop 0 chain is modeled explicitly as EngineCore → AgentRuntime → SovereignKernel → PhysicsManifold → StableStringify.

## Files

- `index.html`: Tailwind + React shell and root element.
- `main.js`: Runtime UI, loop orchestration, intent vetting, and canvas rendering.
- `invariants.js`: Deterministic constants + seeded RNG helper.
- `fossil_stub.js`: Stable serialization + fossilization hash helper.

## Fossil metadata

- `content_fossil_root`: `SHA256(...)`
- `content_fossil_version`: `loop0.clcf.2026-01-22`

## Run locally

```bash
python -m http.server
```

Then open `http://127.0.0.1:8000/loop0/`.
