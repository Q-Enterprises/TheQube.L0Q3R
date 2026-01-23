import { Bus } from "./bus";
import { CPU } from "./cpu";

export function cpuReset(cpu: CPU, bus: Bus): void {
  // Status: IRQ disabled, "unused" bits set (common NES convention)
  cpu.P = 0x24; // 0b0010_0100

  // Registers cleared
  cpu.A = 0x00;
  cpu.X = 0x00;
  cpu.Y = 0x00;

  // Stack pointer: power-on/reset value used by NES test ROMs
  cpu.S = 0xfd;

  // Read reset vector from $FFFC/$FFFD (little-endian)
  const lo = bus.read(0xfffc) & 0xff;
  const hi = bus.read(0xfffd) & 0xff;
  cpu.PC = ((hi << 8) | lo) & 0xffff;
}
