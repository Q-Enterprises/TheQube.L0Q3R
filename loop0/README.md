# Loop0 Playable Checkpoint (Canvas Scaffold)

This folder contains a deterministic, fixed-timestep HTML5 canvas scaffold that mirrors the Loop0 playable checkpoint described in the prompt. It keeps the game loop, physics, input, and fossilization stub separated for easy replacement with canonical implementations.

## Files

- `index.html`: Canvas frame + telemetry panel.
- `main.js`: Game loop, physics integration, collision checks, input wiring.
- `invariants.js`: Fixed timestep constants and ordering helpers.
- `fossil_stub.js`: Stable stringify + hash stub for replay/fossilization.

## Fossil metadata

- `content_fossil_root`: `SHA256(...)`
- `content_fossil_version`: `loop0.clcf.2026-01-22`

## Run locally

```bash
python -m http.server
```

Then open `http://127.0.0.1:8000/loop0/`.
