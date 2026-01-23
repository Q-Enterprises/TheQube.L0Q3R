import { Bus } from "./bus";
import { Mapper } from "./mapper";

export class NesBus implements Bus {
  private ram = new Uint8Array(0x0800); // 2 KB internal RAM

  constructor(private mapper: Mapper) {}

  read(addr: number): number {
    const maskedAddr = addr & 0xffff;

    // 2 KB RAM + mirrors
    if (maskedAddr < 0x2000) {
      return this.ram[maskedAddr & 0x07ff];
    }

    // PPU/APU/IO ranges omitted for brevity…

    // Cartridge space (includes $FFFC/$FFFD reset vector)
    if (maskedAddr >= 0x8000) {
      return this.mapper.cpuRead(maskedAddr) & 0xff;
    }

    return 0x00;
  }

  write(addr: number, value: number): void {
    const maskedAddr = addr & 0xffff;
    const maskedValue = value & 0xff;

    if (maskedAddr < 0x2000) {
      this.ram[maskedAddr & 0x07ff] = maskedValue;
      return;
    }

    // PPU/APU/IO writes omitted…

    if (maskedAddr >= 0x8000) {
      this.mapper.cpuWrite(maskedAddr, maskedValue);
    }
  }
}
