export interface FrameBuffer {
  width: number;
  height: number;
  pixels: Uint32Array;
}

export type FrameCallback = (frame: FrameBuffer) => void;

export class PPU {
  static readonly WIDTH = 256;
  static readonly HEIGHT = 240;

  private frameBuffer: FrameBuffer;
  private onFrame: FrameCallback | null = null;
  private scanlineCycles = 0;
  private frameComplete = false;

  constructor() {
    this.frameBuffer = {
      width: PPU.WIDTH,
      height: PPU.HEIGHT,
      pixels: new Uint32Array(PPU.WIDTH * PPU.HEIGHT),
    };
  }

  setFrameCallback(cb: FrameCallback) {
    this.onFrame = cb;
  }

  readRegister(_addr: number): number {
    return 0;
  }

  writeRegister(_addr: number, _value: number): void {
    return;
  }

  tick(cycles: number) {
    this.scanlineCycles += cycles;
    const cyclesPerFrame = 29780;
    if (this.scanlineCycles >= cyclesPerFrame) {
      this.scanlineCycles -= cyclesPerFrame;
      this.frameComplete = true;
      if (this.onFrame) {
        this.onFrame(this.frameBuffer);
      }
    }
  }

  isFrameComplete(): boolean {
    return this.frameComplete;
  }

  consumeFrameCompleteFlag() {
    this.frameComplete = false;
  }
}
