# NES Emulator: Kernel Development Plan (v0.1)

This blueprint defines the phased implementation of a cycle-accurate NES emulation kernel. This project is treated as a sovereign simulation product, requiring bit-perfect determinism and efficient memory-mapped I/O.

## 1. Hardware baseline (the constraints)

The target architecture is an 8-bit system with the following strict invariants:

| Component | Specification | Notes |
| --- | --- | --- |
| CPU | Ricoh 2A03 (6502 derivative) | 1.79 MHz, 8-bit registers (A, X, Y), 16-bit PC. |
| RAM | 2KB Internal Work RAM | Mirrors exist in the $0000–$07FF address space. |
| PPU | Picture Processing Unit | 256x240 resolution, 8x8 tiles, 64 sprites. |
| APU | Audio Processing Unit | 5 channels: 2 Pulse, 1 Triangle, 1 Noise, 1 DMC. |
| Memory | 16-bit address space | Heavily reliant on mappers for ROM/RAM banking. |

## 2. Phase 1: The logic core (CPU & memory)

Before rendering any pixels, the kernel must execute instructions deterministically.

- Instruction set implementation: implement all official 6502 opcodes. Treat each instruction as a state-mutation function.
- Addressing modes: implement the 13 addressing modes (Absolute, Zero Page, Indexed, etc.).
- Memory interconnect: create a 16-bit address bus. Implement the memory map, including mirroring of the internal 2KB RAM.
- Verification: use "Golden Logs" (e.g., nestest.nes in log mode) to compare your CPU's state (A, X, Y, P, SP, PC) against a known-good execution trace for every cycle.

## 3. Phase 2: The graphics manifold (PPU)

This is the most complex component due to its strict timing requirements relative to the CPU.

- Name tables & attribute tables: implement the background tile-map system.
- Pattern tables: map the CHR-ROM data to 8x8 visual tiles.
- The rendering pipeline: implement scanline-based rendering. Focus on the timing of the V-Blank interrupt, as most games use this as their primary "tick."
- Scrolling: implement pixel-level fine scrolling (PPU registers $2005/$2006).

## 4. Phase 3: The mapper system (sovereignty expansion)

Standard 16-bit address space limits games to 32KB of PRG-ROM. Mappers allow the kernel to "swap" memory banks dynamically.

- Mapper 0 (NROM): simple 16KB or 32KB games (e.g., Donkey Kong, Mario).
- Mapper 1 (MMC1): adds battery-backed RAM and complex banking (e.g., The Legend of Zelda).
- Mapper 4 (MMC3): adds scanline-based IRQs for split-screen effects (e.g., Super Mario Bros. 3).

## 5. Phase 4: Integration & determinism

To align with the World Engine standard, the emulator should support:

- State fossils (save states): capture the entire state of RAM, CPU registers, PPU registers, and mapper state into a canonical buffer.
- Input quantization: store controller input per frame to allow for bit-perfect replay of high-score runs or bug reproduction.
- GC management: avoid frequent object allocation in the main execution loop to prevent frame-rate stuttering during simulation.

## 6. Recommended test sequence

Do not attempt to run commercial games until the kernel is verified:

1. CPU instruction tests (nestest)
2. PPU rendering tests (vbl_nmi, sprite_hit)
3. Basic ROMs (Donkey Kong, Balloon Fight)
4. Advanced ROMs (Super Mario Bros, Contra)
