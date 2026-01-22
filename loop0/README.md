# Loop0 Playable Checkpoint (Canvas Scaffold)

This folder hosts the Jurassic Pixels v0.6 runtime mock, keeping the demo split into an HTML shell and a React/Babel script for rapid iteration.

## Files

- `index.html`: Tailwind + React shell and root element.
- `main.js`: Runtime UI, sim loop, capsule log, and canvas rendering.
- `invariants.js`: Reserved for deterministic constants (unused in v0.6 mock).
- `fossil_stub.js`: Reserved for stable serialization hooks (unused in v0.6 mock).

## Fossil metadata

- `content_fossil_root`: `SHA256(...)`
- `content_fossil_version`: `loop0.clcf.2026-01-22`

## Run locally

```bash
python -m http.server
```

Then open `http://127.0.0.1:8000/loop0/`.
