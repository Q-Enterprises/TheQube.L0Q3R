# NES Memory Mapping — The “World Model”

If the CPU is the agent, the memory map is the world it lives in.

A 16-bit address does not mean flat RAM. It means a 64KB address space that is interpreted differently depending on the region:

| Address range | Meaning |
| --- | --- |
| $0000–$07FF | 2KB internal RAM |
| $0800–$1FFF | Mirrors of RAM (hardware quirk) |
| $2000–$2007 | PPU registers |
| $2008–$3FFF | Mirrored PPU registers |
| $4000–$4017 | APU + I/O |
| $4020–$5FFF | Expansion |
| $6000–$7FFF | Cartridge PRG-RAM |
| $8000–$FFFF | Cartridge PRG-ROM (banked by mappers) |

This is where the illusion of a full computer emerges from a tiny 2KB RAM core.

If you want to build a deterministic emulator, this is the chamber where you define:

- The memory bus.
- The mapper interface.
- The mirroring rules.
- The read/write side effects.

This is the NES equivalent of your corridor’s world engine topology.
