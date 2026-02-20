import { Mapper } from "./mapper";

export class MapperNROM implements Mapper {
  constructor(private prgRom: Uint8Array) {}

  cpuRead(addr: number): number {
    if (addr >= 0x8000 && addr <= 0xffff) {
      const offset =
        this.prgRom.length === 0x4000
          ? (addr - 0x8000) & 0x3fff // 16 KB mirrored
          : addr - 0x8000; // 32 KB
      return this.prgRom[offset] ?? 0x00;
    }
    // Other ranges (RAM, PPU regs, APU, etc.) handled by Bus.
    return 0x00;
  }

  cpuWrite(_addr: number, _value: number): void {
    // NROM has no PRG banking; writes to $8000–$FFFF are ignored.
  }
}
