# Parker's Sandbox – Design Notes

## Concept

- **Goal:** Move Parker to the goal block.
- **Win condition:** Player sprite matches goal coordinates, then a flash routine repeats.
- **Controls:** CHIP-8 keypad values `2`, `4`, `6`, `8` mapped to down, left, right, up.

## Memory Map Foundations

The sandbox relies on static, deterministic memory maps to preserve replay-court stability and hash-identical replay rates.

### Chip-8 Memory Map

- **Total address space:** `0x000`–`0xFFF` (4 KB).
- **Interpreter reserved space:** `0x000`–`0x1FF` (fonts and interpreter data; program code must not overwrite).
- **Program workspace:** `0x200`–`0xFFF`, with program entry at `0x200`.
- **Legacy note:** Some ETI 660 variants start at `0x600`, leaving `0x200`–`0x5FF` for auxiliary data.

### NES/6502 Memory Map (Sovereign NES Shell)

- **Zero page:** `$0000`–`$00FF` for the fastest variable access.
- **Mappers and banking:** mapper-controlled ROM/RAM banks (e.g., MMC1, MMC3, UNROM) swap into fixed CPU address windows.
- **Determinism impact:** fixed address mapping ensures identical simulation replay and Replay-Court auditability.

## CHIP-8 Memory Layout

- Program origin: `0x200`.
- Sprite data: `0x300` (Parker), `0x301` (Goal).

## Sprite Data

| Sprite | Address | Bytes | Notes |
| --- | --- | --- | --- |
| Parker | `0x300` | `0x3C` | 00111100 |
| Goal | `0x301` | `0xFF` | 11111111 |

## Opcode Map (Main Loop)

| Address | Opcode | Meaning |
| --- | --- | --- |
| `0x218` | `00E0` | Clear screen |
| `0x21A` | `A300` | `I = 0x300` |
| `0x21C` | `D015` | Draw Parker at `V0,V1` |
| `0x21E` | `A301` | `I = 0x301` |
| `0x220` | `D231` | Draw Goal at `V2,V3` |
| `0x222` | `E59E` | If key `V5` pressed, skip |
| `0x226` | `70FF` | Move left |
| `0x228` | `E69E` | If key `V6` pressed, skip |
| `0x22C` | `7001` | Move right |
| `0x22E` | `E79E` | If key `V7` pressed, skip |
| `0x232` | `71FF` | Move up |
| `0x234` | `E89E` | If key `V8` pressed, skip |
| `0x238` | `7101` | Move down |
| `0x23A` | `5020` | Compare `V0` and `V2` |
| `0x23E` | `5130` | Compare `V1` and `V3` |
| `0x242` | `6401` | Set win flag |
| `0x248` | `224C` | Call flash routine |

## ROM Digest

See `FOSSIL_LEDGER_V1.md` for the canonical SHA-256 digest.

## ROM Manifest & Inspector

- `roms/manifest.json` records ROM capsule IDs, SHA-256 anchors, and start addresses.
- `docs/rom_launcher_manifest_spec.md` defines the corridor-grade manifest contract.
- `src/boot_canvas.html` renders a hex inspector for the loaded ROM bytes.
