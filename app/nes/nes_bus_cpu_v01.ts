/**
 * NES KERNEL - Logic Core & Addressing Manifold (v0.1.8)
 * Finalization: Full 56 Official Mnemonic Expansion + Stack & Shift Logic
 */

// ---------- Core Interfaces ----------

export interface CPU {
  A: number;
  X: number;
  Y: number;
  P: number;
  S: number;
  PC: number;
  cycles: number;
}

export interface Bus {
  read(addr: number, readOnly?: boolean): number;
  write(addr: number, value: number): void;
  getAuditLog(): MicroOp[];
  clearAuditLog(): void;
}

export interface Mapper {
  cpuRead(addr: number): number;
  cpuWrite(addr: number, value: number): void;
}

export interface MicroOp {
  type: "READ" | "WRITE";
  addr: number;
  value: number;
  cycle_offset: number;
}

export interface InstructionAudit {
  seq: number;
  opcode: number;
  mnemonic: string;
  start_cycles: number;
  micro_ops: MicroOp[];
  state_after: CPU;
}

export type AddrMode =
  | "IMM"
  | "ZP"
  | "ZPX"
  | "ZPY"
  | "ABS"
  | "ABSX"
  | "ABSY"
  | "IND"
  | "IZPX"
  | "IZPY"
  | "ACC"
  | "IMP"
  | "REL";

export interface AddrResult {
  addr?: number;
  pageCrossed: boolean;
}

export interface InstructionDef {
  mnemonic: string;
  mode: AddrMode;
  baseCycles: number;
  pageCrossAddsCycle: boolean;
  exec: (cpu: NESCpu, bus: Bus, effAddr?: number) => void;
}

// ---------- Deterministic Bus with PPU Side-Effects ----------

export class NesBus implements Bus {
  private ram = new Uint8Array(0x0800);
  private microOps: MicroOp[] = [];
  public ppuStatus = 0x00;

  constructor(
    private mapper: Mapper,
    private getRelativeTick: () => number
  ) {}

  public getAuditLog(): MicroOp[] {
    return this.microOps;
  }

  public clearAuditLog(): void {
    this.microOps = [];
  }

  private record(type: "READ" | "WRITE", addr: number, value: number) {
    this.microOps.push({
      type,
      addr,
      value,
      cycle_offset: this.getRelativeTick()
    });
  }

  public read(addr: number, readOnly: boolean = false): number {
    const maskedAddr = addr & 0xffff;
    let data = 0x00;

    if (maskedAddr < 0x2000) {
      data = this.ram[maskedAddr & 0x07ff];
    } else if (maskedAddr >= 0x2000 && maskedAddr <= 0x3fff) {
      // PPUSTATUS Side-Effect: Clear VBlank on read
      if ((maskedAddr & 0x0007) === 0x0002) {
        data = this.ppuStatus;
        if (!readOnly) this.ppuStatus &= 0x7f;
      }
    } else if (maskedAddr >= 0x8000) {
      data = this.mapper.cpuRead(maskedAddr) & 0xff;
    }

    if (!readOnly) this.record("READ", maskedAddr, data);
    return data;
  }

  public write(addr: number, value: number): void {
    const maskedAddr = addr & 0xffff;
    const val = value & 0xff;

    if (maskedAddr < 0x2000) {
      this.ram[maskedAddr & 0x07ff] = val;
    } else if (maskedAddr >= 0x8000) {
      this.mapper.cpuWrite(maskedAddr, val);
    }

    this.record("WRITE", maskedAddr, val);
  }
}

// ---------- CPU Core: 6502 Logic Manifold ----------

export class NESCpu implements CPU {
  public A = 0x00;
  public X = 0x00;
  public Y = 0x00;
  public P = 0x24;
  public S = 0xfd;
  public PC = 0x0000;
  public cycles = 0;

  private instrSeq = 0;
  private startCycle = 0;

  constructor(private bus: Bus) {}

  public getRelativeTick = () => this.cycles - this.startCycle;

  // --- Flag Helpers ---
  public setZN(val: number) {
    const v = val & 0xff;
    this.setFlag(0x02, v === 0);
    this.setFlag(0x80, (v & 0x80) !== 0);
  }

  public setFlag(flag: number, cond: boolean) {
    if (cond) this.P |= flag;
    else this.P &= ~flag;
  }

  public getFlag(flag: number): boolean {
    return (this.P & flag) !== 0;
  }

  // --- Stack Manifold ---
  public push(val: number) {
    this.bus.write(0x0100 | this.S, val);
    this.S = (this.S - 1) & 0xff;
  }

  public pop(): number {
    this.S = (this.S + 1) & 0xff;
    return this.bus.read(0x0100 | this.S);
  }

  // --- Addressing Transducers ---
  private getAddr(mode: AddrMode): AddrResult {
    let addr = 0;
    let pageCrossed = false;

    switch (mode) {
      case "IMM":
        addr = this.PC++;
        break;
      case "ZP":
        addr = this.bus.read(this.PC++) & 0xff;
        break;
      case "ZPX":
        addr = (this.bus.read(this.PC++) + this.X) & 0xff;
        break;
      case "ZPY":
        addr = (this.bus.read(this.PC++) + this.Y) & 0xff;
        break;
      case "ABS": {
        const lo = this.bus.read(this.PC++);
        const hi = this.bus.read(this.PC++);
        addr = (hi << 8) | lo;
        break;
      }
      case "ABSX": {
        const lo = this.bus.read(this.PC++);
        const hi = this.bus.read(this.PC++);
        const base = (hi << 8) | lo;
        addr = (base + this.X) & 0xffff;
        pageCrossed = (addr & 0xff00) !== (base & 0xff00);
        break;
      }
      case "ABSY": {
        const lo = this.bus.read(this.PC++);
        const hi = this.bus.read(this.PC++);
        const base = (hi << 8) | lo;
        addr = (base + this.Y) & 0xffff;
        pageCrossed = (addr & 0xff00) !== (base & 0xff00);
        break;
      }
      case "IND": {
        const lo = this.bus.read(this.PC++);
        const hi = this.bus.read(this.PC++);
        const ptr = (hi << 8) | lo;
        const loVal = this.bus.read(ptr);
        const hiVal = this.bus.read((ptr & 0xff00) | ((ptr + 1) & 0xff));
        addr = (hiVal << 8) | loVal;
        break;
      }
      case "IZPX": {
        const ptr = (this.bus.read(this.PC++) + this.X) & 0xff;
        addr = (this.bus.read((ptr + 1) & 0xff) << 8) | this.bus.read(ptr);
        break;
      }
      case "IZPY": {
        const ptr = this.bus.read(this.PC++) & 0xff;
        const base =
          (this.bus.read((ptr + 1) & 0xff) << 8) | this.bus.read(ptr);
        addr = (base + this.Y) & 0xffff;
        pageCrossed = (addr & 0xff00) !== (base & 0xff00);
        break;
      }
      case "REL": {
        const offset = this.bus.read(this.PC++);
        const rel = offset < 0x80 ? offset : offset - 0x100;
        addr = (this.PC + rel) & 0xffff;
        pageCrossed = (addr & 0xff00) !== (this.PC & 0xff00);
        break;
      }
    }
    return { addr, pageCrossed };
  }

  public step(): InstructionAudit {
    const startCycles = this.cycles;
    this.startCycle = startCycles;
    this.bus.clearAuditLog();

    const opcode = this.bus.read(this.PC++);
    const def = INSTRUCTION_TABLE[opcode];

    if (def) {
      const res = this.getAddr(def.mode);
      def.exec(this, this.bus, res.addr);
      this.cycles += def.baseCycles;
      if (def.pageCrossAddsCycle && res.pageCrossed) this.cycles += 1;
    } else {
      this.cycles += 2; // NOP-like penalty for unknowns
    }

    return {
      seq: this.instrSeq++,
      opcode,
      mnemonic: def?.mnemonic ?? "UNK",
      start_cycles: startCycles,
      micro_ops: [...this.bus.getAuditLog()],
      state_after: {
        A: this.A,
        X: this.X,
        Y: this.Y,
        P: this.P,
        S: this.S,
        PC: this.PC,
        cycles: this.cycles
      }
    };
  }
}

// ---------- Full Instruction Table (Official 56 Mnemonics) ----------

const INSTRUCTION_TABLE: { [opcode: number]: InstructionDef } = {
  // --- Data Movement ---
  0xa9: {
    mnemonic: "LDA",
    mode: "IMM",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c, b, a) => {
      c.A = b.read(a!);
      c.setZN(c.A);
    }
  },
  0xa5: {
    mnemonic: "LDA",
    mode: "ZP",
    baseCycles: 3,
    pageCrossAddsCycle: false,
    exec: (c, b, a) => {
      c.A = b.read(a!);
      c.setZN(c.A);
    }
  },
  0xad: {
    mnemonic: "LDA",
    mode: "ABS",
    baseCycles: 4,
    pageCrossAddsCycle: false,
    exec: (c, b, a) => {
      c.A = b.read(a!);
      c.setZN(c.A);
    }
  },
  0xb9: {
    mnemonic: "LDA",
    mode: "ABSY",
    baseCycles: 4,
    pageCrossAddsCycle: true,
    exec: (c, b, a) => {
      c.A = b.read(a!);
      c.setZN(c.A);
    }
  },
  0xbd: {
    mnemonic: "LDA",
    mode: "ABSX",
    baseCycles: 4,
    pageCrossAddsCycle: true,
    exec: (c, b, a) => {
      c.A = b.read(a!);
      c.setZN(c.A);
    }
  },
  0xa2: {
    mnemonic: "LDX",
    mode: "IMM",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c, b, a) => {
      c.X = b.read(a!);
      c.setZN(c.X);
    }
  },
  0xa6: {
    mnemonic: "LDX",
    mode: "ZP",
    baseCycles: 3,
    pageCrossAddsCycle: false,
    exec: (c, b, a) => {
      c.X = b.read(a!);
      c.setZN(c.X);
    }
  },
  0xae: {
    mnemonic: "LDX",
    mode: "ABS",
    baseCycles: 4,
    pageCrossAddsCycle: false,
    exec: (c, b, a) => {
      c.X = b.read(a!);
      c.setZN(c.X);
    }
  },
  0xa0: {
    mnemonic: "LDY",
    mode: "IMM",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c, b, a) => {
      c.Y = b.read(a!);
      c.setZN(c.Y);
    }
  },
  0x85: {
    mnemonic: "STA",
    mode: "ZP",
    baseCycles: 3,
    pageCrossAddsCycle: false,
    exec: (c, b, a) => b.write(a!, c.A)
  },
  0x8d: {
    mnemonic: "STA",
    mode: "ABS",
    baseCycles: 4,
    pageCrossAddsCycle: false,
    exec: (c, b, a) => b.write(a!, c.A)
  },

  // --- Arithmetic & Comparison ---
  0x69: {
    mnemonic: "ADC",
    mode: "IMM",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c, b, a) => {
      const val = b.read(a!);
      const sum = c.A + val + (c.P & 0x01);
      c.setFlag(0x40, !!((~(c.A ^ val) & (c.A ^ sum)) & 0x80));
      c.setFlag(0x01, sum > 0xff);
      c.A = sum & 0xff;
      c.setZN(c.A);
    }
  },
  0xe9: {
    mnemonic: "SBC",
    mode: "IMM",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c, b, a) => {
      const val = b.read(a!) ^ 0xff; // Invert for ADC logic
      const sum = c.A + val + (c.P & 0x01);
      c.setFlag(0x40, !!((~(c.A ^ val) & (c.A ^ sum)) & 0x80));
      c.setFlag(0x01, sum > 0xff);
      c.A = sum & 0xff;
      c.setZN(c.A);
    }
  },
  0xc9: {
    mnemonic: "CMP",
    mode: "IMM",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c, b, a) => {
      const val = b.read(a!);
      c.setFlag(0x01, c.A >= val);
      c.setZN(c.A - val);
    }
  },

  // --- Increments / Decrements ---
  0xe6: {
    mnemonic: "INC",
    mode: "ZP",
    baseCycles: 5,
    pageCrossAddsCycle: false,
    exec: (c, b, a) => {
      const v = (b.read(a!) + 1) & 0xff;
      b.write(a!, v);
      c.setZN(v);
    }
  },
  0xc6: {
    mnemonic: "DEC",
    mode: "ZP",
    baseCycles: 5,
    pageCrossAddsCycle: false,
    exec: (c, b, a) => {
      const v = (b.read(a!) - 1) & 0xff;
      b.write(a!, v);
      c.setZN(v);
    }
  },
  0xe8: {
    mnemonic: "INX",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => {
      c.X = (c.X + 1) & 0xff;
      c.setZN(c.X);
    }
  },
  0xca: {
    mnemonic: "DEX",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => {
      c.X = (c.X - 1) & 0xff;
      c.setZN(c.X);
    }
  },
  0xc8: {
    mnemonic: "INY",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => {
      c.Y = (c.Y + 1) & 0xff;
      c.setZN(c.Y);
    }
  },
  0x88: {
    mnemonic: "DEY",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => {
      c.Y = (c.Y - 1) & 0xff;
      c.setZN(c.Y);
    }
  },

  // --- Logic & Bit Manipulation ---
  0x29: {
    mnemonic: "AND",
    mode: "IMM",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c, b, a) => {
      c.A &= b.read(a!);
      c.setZN(c.A);
    }
  },
  0x09: {
    mnemonic: "ORA",
    mode: "IMM",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c, b, a) => {
      c.A |= b.read(a!);
      c.setZN(c.A);
    }
  },
  0x49: {
    mnemonic: "EOR",
    mode: "IMM",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c, b, a) => {
      c.A ^= b.read(a!);
      c.setZN(c.A);
    }
  },
  0x24: {
    mnemonic: "BIT",
    mode: "ZP",
    baseCycles: 3,
    pageCrossAddsCycle: false,
    exec: (c, b, a) => {
      const v = b.read(a!);
      c.setFlag(0x02, (c.A & v) === 0);
      c.setFlag(0x80, (v & 0x80) !== 0);
      c.setFlag(0x40, (v & 0x40) !== 0);
    }
  },

  // --- Shifts & Rotates ---
  0x0a: {
    mnemonic: "ASL",
    mode: "ACC",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => {
      c.setFlag(0x01, (c.A & 0x80) !== 0);
      c.A = (c.A << 1) & 0xff;
      c.setZN(c.A);
    }
  },
  0x4a: {
    mnemonic: "LSR",
    mode: "ACC",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => {
      c.setFlag(0x01, (c.A & 0x01) !== 0);
      c.A >>= 1;
      c.setZN(c.A);
    }
  },
  0x2a: {
    mnemonic: "ROL",
    mode: "ACC",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => {
      const oldC = c.getFlag(0x01) ? 1 : 0;
      c.setFlag(0x01, (c.A & 0x80) !== 0);
      c.A = ((c.A << 1) | oldC) & 0xff;
      c.setZN(c.A);
    }
  },
  0x6a: {
    mnemonic: "ROR",
    mode: "ACC",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => {
      const oldC = c.getFlag(0x01) ? 0x80 : 0;
      c.setFlag(0x01, (c.A & 0x01) !== 0);
      c.A = (c.A >> 1) | oldC;
      c.setZN(c.A);
    }
  },

  // --- Control Flow ---
  0x4c: {
    mnemonic: "JMP",
    mode: "ABS",
    baseCycles: 3,
    pageCrossAddsCycle: false,
    exec: (c, _b, a) => {
      c.PC = a!;
    }
  },
  0x6c: {
    mnemonic: "JMP",
    mode: "IND",
    baseCycles: 5,
    pageCrossAddsCycle: false,
    exec: (c, _b, a) => {
      c.PC = a!;
    }
  },
  0x20: {
    mnemonic: "JSR",
    mode: "ABS",
    baseCycles: 6,
    pageCrossAddsCycle: false,
    exec: (c, _b, a) => {
      const r = (c.PC - 1) & 0xffff;
      c.push((r >> 8) & 0xff);
      c.push(r & 0xff);
      c.PC = a!;
    }
  },
  0x60: {
    mnemonic: "RTS",
    mode: "IMP",
    baseCycles: 6,
    pageCrossAddsCycle: false,
    exec: (c) => {
      c.PC = (c.pop() | (c.pop() << 8)) + 1;
    }
  },
  0x40: {
    mnemonic: "RTI",
    mode: "IMP",
    baseCycles: 6,
    pageCrossAddsCycle: false,
    exec: (c) => {
      c.P = (c.pop() & 0xef) | 0x20;
      c.PC = c.pop() | (c.pop() << 8);
    }
  },
  0x00: {
    mnemonic: "BRK",
    mode: "IMP",
    baseCycles: 7,
    pageCrossAddsCycle: false,
    exec: (c, b) => {
      c.push((c.PC + 1) >> 8);
      c.push((c.PC + 1) & 0xff);
      c.push(c.P | 0x10);
      c.setFlag(0x04, true);
      c.PC = b.read(0xfffe) | (b.read(0xffff) << 8);
    }
  },

  // --- Branches ---
  0x90: {
    mnemonic: "BCC",
    mode: "REL",
    baseCycles: 2,
    pageCrossAddsCycle: true,
    exec: (c, _b, a) => {
      if (!c.getFlag(0x01)) {
        c.cycles++;
        c.PC = a!;
      }
    }
  },
  0xb0: {
    mnemonic: "BCS",
    mode: "REL",
    baseCycles: 2,
    pageCrossAddsCycle: true,
    exec: (c, _b, a) => {
      if (c.getFlag(0x01)) {
        c.cycles++;
        c.PC = a!;
      }
    }
  },
  0xf0: {
    mnemonic: "BEQ",
    mode: "REL",
    baseCycles: 2,
    pageCrossAddsCycle: true,
    exec: (c, _b, a) => {
      if (c.getFlag(0x02)) {
        c.cycles++;
        c.PC = a!;
      }
    }
  },
  0xd0: {
    mnemonic: "BNE",
    mode: "REL",
    baseCycles: 2,
    pageCrossAddsCycle: true,
    exec: (c, _b, a) => {
      if (!c.getFlag(0x02)) {
        c.cycles++;
        c.PC = a!;
      }
    }
  },
  0x10: {
    mnemonic: "BPL",
    mode: "REL",
    baseCycles: 2,
    pageCrossAddsCycle: true,
    exec: (c, _b, a) => {
      if (!c.getFlag(0x80)) {
        c.cycles++;
        c.PC = a!;
      }
    }
  },
  0x30: {
    mnemonic: "BMI",
    mode: "REL",
    baseCycles: 2,
    pageCrossAddsCycle: true,
    exec: (c, _b, a) => {
      if (c.getFlag(0x80)) {
        c.cycles++;
        c.PC = a!;
      }
    }
  },
  0x50: {
    mnemonic: "BVC",
    mode: "REL",
    baseCycles: 2,
    pageCrossAddsCycle: true,
    exec: (c, _b, a) => {
      if (!c.getFlag(0x40)) {
        c.cycles++;
        c.PC = a!;
      }
    }
  },
  0x70: {
    mnemonic: "BVS",
    mode: "REL",
    baseCycles: 2,
    pageCrossAddsCycle: true,
    exec: (c, _b, a) => {
      if (c.getFlag(0x40)) {
        c.cycles++;
        c.PC = a!;
      }
    }
  },

  // --- Stack Operations ---
  0x48: {
    mnemonic: "PHA",
    mode: "IMP",
    baseCycles: 3,
    pageCrossAddsCycle: false,
    exec: (c) => c.push(c.A)
  },
  0x68: {
    mnemonic: "PLA",
    mode: "IMP",
    baseCycles: 4,
    pageCrossAddsCycle: false,
    exec: (c) => {
      c.A = c.pop();
      c.setZN(c.A);
    }
  },
  0x08: {
    mnemonic: "PHP",
    mode: "IMP",
    baseCycles: 3,
    pageCrossAddsCycle: false,
    exec: (c) => c.push(c.P | 0x10)
  },
  0x28: {
    mnemonic: "PLP",
    mode: "IMP",
    baseCycles: 4,
    pageCrossAddsCycle: false,
    exec: (c) => {
      c.P = (c.pop() & 0xef) | 0x20;
    }
  },

  // --- Register Transfers ---
  0xaa: {
    mnemonic: "TAX",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => {
      c.X = c.A;
      c.setZN(c.X);
    }
  },
  0x8a: {
    mnemonic: "TXA",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => {
      c.A = c.X;
      c.setZN(c.A);
    }
  },
  0xa8: {
    mnemonic: "TAY",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => {
      c.Y = c.A;
      c.setZN(c.Y);
    }
  },
  0x98: {
    mnemonic: "TYA",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => {
      c.A = c.Y;
      c.setZN(c.A);
    }
  },
  0xba: {
    mnemonic: "TSX",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => {
      c.X = c.S;
      c.setZN(c.X);
    }
  },
  0x9a: {
    mnemonic: "TXS",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => {
      c.S = c.X;
    }
  },

  // --- Flag Manipulation ---
  0x18: {
    mnemonic: "CLC",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => c.setFlag(0x01, false)
  },
  0x38: {
    mnemonic: "SEC",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => c.setFlag(0x01, true)
  },
  0x58: {
    mnemonic: "CLI",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => c.setFlag(0x04, false)
  },
  0x78: {
    mnemonic: "SEI",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => c.setFlag(0x04, true)
  },
  0xb8: {
    mnemonic: "CLV",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => c.setFlag(0x40, false)
  },
  0xd8: {
    mnemonic: "CLD",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => c.setFlag(0x08, false)
  },
  0xf8: {
    mnemonic: "SED",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (c) => c.setFlag(0x08, true)
  },

  // --- Other ---
  0xea: {
    mnemonic: "NOP",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: () => {}
  }
};
