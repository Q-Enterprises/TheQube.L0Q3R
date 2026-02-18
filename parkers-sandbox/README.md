# Parker's Sandbox – Level 1 (CHIP-8)

A deterministic, inspectable CHIP-8 cartridge for Parker's Sandbox. The ROM, emulator core, and boot canvas are designed for fossilization and replay-court validation.

## Contents

- `roms/parkers_sandbox_level1.ch8` – compiled CHIP-8 ROM.
- `roms/manifest.json` – ROM manifest with SHA-256 anchors and start addresses.
- `shell.html` – launcher HUD shell UI.
- `src/chip8.js` – minimal CHIP-8 core (only opcodes used by the ROM).
- `src/boot_canvas.html` – browser boot harness.
- `src/main.ts` – shell HUD wiring for checkpoints and ROM listings.
- `docs/PARKERS_SANDBOX_DESIGN.md` – design notes and opcode map.
- `docs/FOSSIL_LEDGER_V1.md` – digest ledger for the ROM and boot assets.
- `docs/rom_launcher_manifest_spec.md` – corridor-grade ROM manifest specification.

## Running

1. Serve the folder with a static file server (e.g. `python3 -m http.server`).
2. Open `parkers-sandbox/shell.html` in your browser.
3. Use the numeric keypad-style keys: `4` (left), `6` (right), `8` (up), `2` (down).

## Notes

- CHIP-8 display is 64×32. The boot harness scales pixels for readability.
- The goal sprite is a solid 8-pixel block. Reaching it triggers a flash loop.
- The boot harness includes a hex inspector for the loaded ROM.
