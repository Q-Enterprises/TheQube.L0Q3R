import { CPU } from "./CPU";
import { SystemBus } from "./Bus";
import { PPU, FrameCallback } from "./PPU";

export class Emulator {
  private cpu: CPU;
  private bus: SystemBus;
  private ppu: PPU;
  private running = false;

  private static readonly MAX_CYCLES_PER_FRAME = 40000;

  constructor(onFrame: FrameCallback) {
    this.ppu = new PPU();
    this.ppu.setFrameCallback(onFrame);
    this.bus = new SystemBus(this.ppu);
    this.cpu = new CPU(this.bus);
  }

  loadROM(romData: Uint8Array) {
    this.bus.loadROM(romData);
    this.cpu.reset(0x8000);
  }

  start() {
    if (this.running) {
      return;
    }
    this.running = true;
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
  }

  private loop = () => {
    if (!this.running) {
      return;
    }

    let cyclesThisFrame = 0;

    while (!this.ppu.isFrameComplete()) {
      const cycles = this.cpu.step();
      this.ppu.tick(cycles);
      cyclesThisFrame += cycles;

      if (cyclesThisFrame > Emulator.MAX_CYCLES_PER_FRAME) {
        throw new Error(
          `Harness guardrail tripped: >${Emulator.MAX_CYCLES_PER_FRAME} cycles without frameComplete`
        );
      }
    }

    this.ppu.consumeFrameCompleteFlag();
    requestAnimationFrame(this.loop);
  };
}
