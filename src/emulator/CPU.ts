export interface CPUState {
  a: number;
  x: number;
  y: number;
  p: number;
  s: number;
  pc: number;
  cycles: number;
}

export interface Bus {
  read(addr: number): number;
  write(addr: number, value: number): void;
}

export class CPU {
  private state: CPUState;
  private bus: Bus;

  constructor(bus: Bus) {
    this.bus = bus;
    this.state = {
      a: 0,
      x: 0,
      y: 0,
      p: 0x24,
      s: 0xfd,
      pc: 0x8000,
      cycles: 0,
    };
  }

  reset(pc: number = 0x8000) {
    this.state.pc = pc;
    this.state.a = 0;
    this.state.x = 0;
    this.state.y = 0;
    this.state.p = 0x24;
    this.state.s = 0xfd;
    this.state.cycles = 0;
  }

  getState(): CPUState {
    return { ...this.state };
  }

  step(): number {
    const opcode = this.bus.read(this.state.pc);
    const cycles = this.execute(opcode);
    this.state.cycles += cycles;
    return cycles;
  }

  private execute(opcode: number): number {
    switch (opcode) {
      case 0x00: // BRK (stub)
        return 7;
      case 0xea: // NOP
        this.state.pc += 1;
        return 2;
      default:
        this.state.pc += 1;
        return 2;
    }
  }
}
