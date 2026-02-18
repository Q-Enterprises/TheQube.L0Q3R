# FOSSIL_LEDGER_V1 – Parker's Sandbox

This ledger captures canonical SHA-256 digests for the Level 1 cartridge and boot artifacts.

## Digest Table

| Artifact | Path | SHA-256 |
| --- | --- | --- |
| ROM | `roms/parkers_sandbox_level1.ch8` | `sha256:57cdf8df46142c25574757d3327cee1a9525d4f0eed256bf2058779789c2f7ce` |
| ROM Manifest | `roms/manifest.json` | `sha256:21d9258931ec9f6cddff9f85c4e970db14c31dd4ecd721f8564d75cebb2e434e` |
| Shell UI | `shell.html` | `sha256:b4bf40a703d11f0b28250d66d572da15de3ec9b7f29ea7af892b1b1cb32f3483` |
| Boot Canvas | `src/boot_canvas.html` | `sha256:82d7d585ba84080be1eaa86804fe1825c31239f8a27083562eb3fbfc3e8f513c` |
| CHIP-8 Core | `src/chip8.js` | `sha256:79a290efaf53a842ddf6ef183e67c7cf1e2e5b4f25ab1b6839970fcfb072f7f1` |
| Shell Script | `src/main.ts` | `sha256:43dbc180183f46453f0e5391c298376d0fead0cb5931780ce07648e3ff4dcbe8` |
| Design Notes | `docs/PARKERS_SANDBOX_DESIGN.md` | `sha256:c4866d3c04ed5e440a408e68548857715f001d3b6acbf64a0131c8e34f1fcf38` |
| Manifest Spec | `docs/rom_launcher_manifest_spec.md` | `sha256:6097274f80ac4e54e33a1ff850d333cc9d917beeb35d7a4a90fa672612110668` |
| Chip8 Redirect | `chip8.html` | `sha256:6c80e21dd5921fc39749c7e4621f8e75b037ce156e54a9af0796c72e7105370b` |

## Verification

To re-compute the digests, run:

```bash
sha256sum \
  roms/parkers_sandbox_level1.ch8 \
  roms/manifest.json \
  shell.html \
  src/boot_canvas.html \
  src/chip8.js \
  src/main.ts \
  docs/PARKERS_SANDBOX_DESIGN.md \
  docs/rom_launcher_manifest_spec.md \
  chip8.html
```
