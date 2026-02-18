# ROM Launcher Manifest Specification (Corridor-Grade)

_For inclusion in the Parker’s Sandbox High-Fidelity Manual (Page 13)._  
This specification defines the legal contract between ROM artifacts (Git LFS), manifest entries, the Replay-Court API, and the Fossil Ledger.

## 1. Purpose

The ROM Launcher Manifest defines the canonical identity of each cartridge within Parker’s Sandbox. It guarantees:

- deterministic loading
- byte-level integrity
- lineage preservation
- Replay-Court admissibility

Every ROM listed in the manifest must be tracked via **Git LFS** and must include a **SHA-256 anchor** that binds the ROM to its fossil lineage.

## 2. Manifest File Format

- **Filename:** `roms/manifest.json`
- **Encoding:** UTF-8
- **Schema:** `RomManifest.v1`

### Example Structure

```json
{
  "schema": "RomManifest.v1",
  "title": "Parker Shell Cartridges",
  "roms": [
    {
      "id": "homebrew_01",
      "name": "Parker Mon (Homebrew)",
      "path": "/roms/homebrew_01.ch8",
      "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "start_address": "0x200"
    }
  ]
}
```

## 3. Field Definitions

### `schema`
Identifies the manifest version. Used by the ROM Launcher to validate compatibility.

### `title`
Human-readable label for the cartridge collection.

### `roms[]`
An ordered list of ROM entries. Each entry is a **ROM Capsule**.

## 4. ROM Capsule Specification

### `id`
A unique, stable identifier used by Replay-Court and the Fossil Ledger.

### `name`
Display name shown in the ROM Launcher UI.

### `path`
Absolute or relative path to the `.ch8` file. Must reference a **Git LFS-tracked** binary.

### `sha256`
The canonical state anchor for the ROM. Computed from the exact binary blob stored in LFS and used by Replay-Court to verify authenticity, lineage, and deterministic replay compatibility.

### `start_address`
Defines the execution origin:

- `0x200` — Standard Chip-8
- `0x600` — ETI 660 variant

This ensures the ROM is loaded into the correct region of the Chip-8 memory map.

## 5. Verification Pipeline (ROM Launcher → Replay-Court)

When a user selects a ROM, the launcher performs:

1. **LFS Fetch** — Retrieve the binary blob from Git LFS.
2. **SHA-256 Hashing** — Compute the hash of the fetched blob.
3. **Manifest Comparison** — Compare computed hash with the manifest’s `sha256` field.
   - **Match:** ROM is valid and admissible.
   - **Mismatch:** ROM is rejected; Replay-Court logs a **Causal Integrity Violation**.
4. **Memory Map Placement** — Load the ROM at the specified `start_address`.
5. **Execution Handoff** — Initialize the emulator with the ROM Capsule, memory map, seed entropy, and tick index to produce a zero-drift execution environment.

## 6. Manual Integration (Page 13 Callout Block)

**ROM Manifest Verification**  
Before a cartridge is allowed to boot, the ROM Launcher verifies its identity using the manifest’s SHA-256 anchor. This ensures every `.ch8` file is authentic, unmodified, lineage-correct, and Replay-Court admissible. ROMs that fail verification cannot be executed within Parker’s Sandbox.
