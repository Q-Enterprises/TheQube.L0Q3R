# NES Bus & Memory Map Implementation Notes (v0.1)

These notes describe how to turn the NES memory map into a deterministic bus implementation, including routing logic, side effects, mapper integration, and the CPU reset vector.

## 1. Memory map topology

The CPU exposes a 16-bit address bus, so every read/write must be routed by address range:

- **$0000–$1FFF (RAM + mirrors):** The NES only has 2KB of internal RAM at $0000–$07FF. The rest is mirrored, so read/write addresses in $0800–$1FFF are masked to $0000–$07FF.
- **$2000–$3FFF (PPU registers):** $2000–$2007 are the actual registers. $2008–$3FFF are mirrors, so mask to $2000–$2007.
- **$4000–$4017 (APU + I/O):** Audio registers plus controller input ports.
- **$4020–$5FFF (expansion):** Expansion ROM or hardware.
- **$6000–$7FFF (cartridge PRG-RAM):** Battery-backed save RAM.
- **$8000–$FFFF (cartridge PRG-ROM):** Program ROM, banked via mapper logic.

A typical bus read/write handler is a series of range checks (if/else or switch), with explicit masking for mirror ranges.

## 2. Read/write side effects (contract surface)

Deterministic emulation requires modeling register side effects. Reads are not always pure. Example: reading PPU status at $2002:

1. Returns the status byte (including VBlank flag).
2. **Side effect:** clears VBlank flag and resets the internal PPU address latch used by $2005/$2006.

If you skip these side effects, games can stall waiting for flags that never clear. Treat each register as a small state machine with explicit read/write transitions.

## 3. Mapper interface

The mapper is the cartridge’s bank-switching logic. Keep the bus generic by defining a mapper interface such as:

- `cpuRead(address)` / `cpuWrite(address, value)` for $6000–$FFFF
- `ppuRead(address)` / `ppuWrite(address, value)` for CHR ROM/RAM
- Optional IRQ hooks for scanline counters (MMC3)

The bus delegates all cartridge space requests to the mapper, which owns the current bank state. This keeps mapper-specific logic isolated and makes deterministic replay tractable.

## 4. CPU reset vector (boot contract)

On reset, the CPU reads the 16-bit address stored at $FFFC–$FFFD and sets the program counter (PC) to that value. This reset vector is the entry point into the cartridge program.

To implement reset:

1. Read low byte at $FFFC and high byte at $FFFD.
2. Set PC = (high << 8) | low.
3. Initialize status flags and stack pointer to the hardware-defined reset state.

This boot contract is the first deterministic handshake between the CPU core and the memory map.
