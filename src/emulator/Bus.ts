import { Bus } from "./CPU";
import { PPU } from "./PPU";

export class SystemBus implements Bus {
  private ram: Uint8Array;
  private rom: Uint8Array | null = null;
  private ppu: PPU;

  constructor(ppu: PPU) {
    this.ram = new Uint8Array(0x0800);
    this.ppu = ppu;
  }

  loadROM(romData: Uint8Array) {
    this.rom = romData;
  }

  read(addr: number): number {
    const masked = addr & 0xffff;

    if (masked < 0x2000) {
      return this.ram[masked & 0x07ff];
    }

    if (masked >= 0x2000 && masked <= 0x2007) {
      return this.ppu.readRegister(masked);
    }

    if (masked >= 0x8000 && this.rom) {
      const offset = masked - 0x8000;
      if (offset < this.rom.length) {
        return this.rom[offset];
      }
    }

    return 0;
  }

  write(addr: number, value: number): void {
    const masked = addr & 0xffff;
    const byte = value & 0xff;

    if (masked < 0x2000) {
      this.ram[masked & 0x07ff] = byte;
      return;
    }

    if (masked >= 0x2000 && masked <= 0x2007) {
      this.ppu.writeRegister(masked, byte);
    }
  }
}
