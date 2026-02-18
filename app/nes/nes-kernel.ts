/**
 * NES KERNEL - Memory Bus, NROM Mapper, & CPU Core (v0.1.4)
 * Fix: Relative Cycle Offsets for Deterministic Audit Consensus
 */

// ---------- Core Interfaces ----------

export interface CPU {
  a: number;
  x: number;
  y: number;
  p: number;
  s: number;
  pc: number;
  cycles: number;
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

/**
 * MicroOp: Represents a single bus interaction.
 * cycle_offset is now strictly RELATIVE to the start of the instruction.
 */
export interface MicroOp {
  type: "READ" | "WRITE";
  addr: number;
  value: number;
  cycle_offset: number;
}

/**
 * InstructionAudit: The definitive fossil of a single CPU execution step.
 */
export interface InstructionAudit {
  seq: number;
  opcode: number;
  mnemonic: string;
  start_cycles: number;
  micro_ops: MicroOp[];
  state_after: CPU;
}

export interface AddrResult {
  addr?: number;
  pageCrossed: boolean;
  operand: number | null;
}

export interface InstructionDef {
  opcode: number;
  mnemonic: string;
  mode: AddrMode;
  baseCycles: number;
  pageCrossAddsCycle: boolean;
  exec: (cpu: NESCpu, bus: Bus, addr?: number, operand?: number | null) => void;
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

const INSTRUCTION_TABLE: InstructionDef[] = [
  {
    opcode: 0xa9,
    mnemonic: "LDA",
    mode: "IMM",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: (cpu, bus, _addr, operand) => {
      const value = operand ?? bus.read(cpu.pc);
      cpu.a = value & 0xff;
      cpu.setZN(cpu.a);
    }
  },
  {
    opcode: 0xa5,
    mnemonic: "LDA",
    mode: "ZP",
    baseCycles: 3,
    pageCrossAddsCycle: false,
    exec: (cpu, bus, addr) => {
      const value = bus.read(addr!);
      cpu.a = value & 0xff;
      cpu.setZN(cpu.a);
    }
  },
  {
    opcode: 0xb5,
    mnemonic: "LDA",
    mode: "ZPX",
    baseCycles: 4,
    pageCrossAddsCycle: false,
    exec: (cpu, bus, addr) => {
      const value = bus.read(addr!);
      cpu.a = value & 0xff;
      cpu.setZN(cpu.a);
    }
  },
  {
    opcode: 0xad,
    mnemonic: "LDA",
    mode: "ABS",
    baseCycles: 4,
    pageCrossAddsCycle: false,
    exec: (cpu, bus, addr) => {
      const value = bus.read(addr!);
      cpu.a = value & 0xff;
      cpu.setZN(cpu.a);
    }
  },
  {
    opcode: 0xbd,
    mnemonic: "LDA",
    mode: "ABSX",
    baseCycles: 4,
    pageCrossAddsCycle: true,
    exec: (cpu, bus, addr) => {
      const value = bus.read(addr!);
      cpu.a = value & 0xff;
      cpu.setZN(cpu.a);
    }
  },
  {
    opcode: 0xb9,
    mnemonic: "LDA",
    mode: "ABSY",
    baseCycles: 4,
    pageCrossAddsCycle: true,
    exec: (cpu, bus, addr) => {
      const value = bus.read(addr!);
      cpu.a = value & 0xff;
      cpu.setZN(cpu.a);
    }
  },
  {
    opcode: 0xa1,
    mnemonic: "LDA",
    mode: "IZPX",
    baseCycles: 6,
    pageCrossAddsCycle: false,
    exec: (cpu, bus, addr) => {
      const value = bus.read(addr!);
      cpu.a = value & 0xff;
      cpu.setZN(cpu.a);
    }
  },
  {
    opcode: 0xb1,
    mnemonic: "LDA",
    mode: "IZPY",
    baseCycles: 5,
    pageCrossAddsCycle: true,
    exec: (cpu, bus, addr) => {
      const value = bus.read(addr!);
      cpu.a = value & 0xff;
      cpu.setZN(cpu.a);
    }
  },
  {
    opcode: 0x85,
    mnemonic: "STA",
    mode: "ZP",
    baseCycles: 3,
    pageCrossAddsCycle: false,
    exec: (cpu, bus, addr) => {
      bus.write(addr!, cpu.a);
    }
  },
  {
    opcode: 0x95,
    mnemonic: "STA",
    mode: "ZPX",
    baseCycles: 4,
    pageCrossAddsCycle: false,
    exec: (cpu, bus, addr) => {
      bus.write(addr!, cpu.a);
    }
  },
  {
    opcode: 0x8d,
    mnemonic: "STA",
    mode: "ABS",
    baseCycles: 4,
    pageCrossAddsCycle: false,
    exec: (cpu, bus, addr) => {
      bus.write(addr!, cpu.a);
    }
  },
  {
    opcode: 0x9d,
    mnemonic: "STA",
    mode: "ABSX",
    baseCycles: 5,
    pageCrossAddsCycle: false,
    exec: (cpu, bus, addr) => {
      bus.write(addr!, cpu.a);
    }
  },
  {
    opcode: 0x99,
    mnemonic: "STA",
    mode: "ABSY",
    baseCycles: 5,
    pageCrossAddsCycle: false,
    exec: (cpu, bus, addr) => {
      bus.write(addr!, cpu.a);
    }
  },
  {
    opcode: 0x81,
    mnemonic: "STA",
    mode: "IZPX",
    baseCycles: 6,
    pageCrossAddsCycle: false,
    exec: (cpu, bus, addr) => {
      bus.write(addr!, cpu.a);
    }
  },
  {
    opcode: 0x91,
    mnemonic: "STA",
    mode: "IZPY",
    baseCycles: 6,
    pageCrossAddsCycle: false,
    exec: (cpu, bus, addr) => {
      bus.write(addr!, cpu.a);
    }
  },
  {
    opcode: 0xea,
    mnemonic: "NOP",
    mode: "IMP",
    baseCycles: 2,
    pageCrossAddsCycle: false,
    exec: () => {
      // no-op
    }
  },
  {
    opcode: 0x10,
    mnemonic: "BPL",
    mode: "REL",
    baseCycles: 2,
    pageCrossAddsCycle: true,
    exec: (cpu, _bus, addr) => {
      cpu.branchIf((cpu.p & 0x80) === 0, addr);
    }
  },
  {
    opcode: 0x30,
    mnemonic: "BMI",
    mode: "REL",
    baseCycles: 2,
    pageCrossAddsCycle: true,
    exec: (cpu, _bus, addr) => {
      cpu.branchIf((cpu.p & 0x80) !== 0, addr);
    }
  },
  {
    opcode: 0x50,
    mnemonic: "BVC",
    mode: "REL",
    baseCycles: 2,
    pageCrossAddsCycle: true,
    exec: (cpu, _bus, addr) => {
      cpu.branchIf((cpu.p & 0x40) === 0, addr);
    }
  },
  {
    opcode: 0x70,
    mnemonic: "BVS",
    mode: "REL",
    baseCycles: 2,
    pageCrossAddsCycle: true,
    exec: (cpu, _bus, addr) => {
      cpu.branchIf((cpu.p & 0x40) !== 0, addr);
    }
  },
  {
    opcode: 0x90,
    mnemonic: "BCC",
    mode: "REL",
    baseCycles: 2,
    pageCrossAddsCycle: true,
    exec: (cpu, _bus, addr) => {
      cpu.branchIf((cpu.p & 0x01) === 0, addr);
    }
  },
  {
    opcode: 0xb0,
    mnemonic: "BCS",
    mode: "REL",
    baseCycles: 2,
    pageCrossAddsCycle: true,
    exec: (cpu, _bus, addr) => {
      cpu.branchIf((cpu.p & 0x01) !== 0, addr);
    }
  },
  {
    opcode: 0xd0,
    mnemonic: "BNE",
    mode: "REL",
    baseCycles: 2,
    pageCrossAddsCycle: true,
    exec: (cpu, _bus, addr) => {
      cpu.branchIf((cpu.p & 0x02) === 0, addr);
    }
  },
  {
    opcode: 0xf0,
    mnemonic: "BEQ",
    mode: "REL",
    baseCycles: 2,
    pageCrossAddsCycle: true,
    exec: (cpu, _bus, addr) => {
      cpu.branchIf((cpu.p & 0x02) !== 0, addr);
    }
  }
];

const INSTRUCTION_BY_OPCODE = new Map(
  INSTRUCTION_TABLE.map((def) => [def.opcode, def])
);

// ---------- NES Bus Implementation with Relative Offsets ----------

export class NesBus implements Bus {
  private ram = new Uint8Array(2048);
  private microOps: MicroOp[] = [];

  /**
   * getOffset: A transducer provided by the CPU to calculate
   * the relative cycle tick within the current instruction.
   */
  constructor(
    private mapper: Mapper,
    private getOffset: () => number
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
      cycle_offset: this.getOffset()
    });
  }

  public read(addr: number, readOnly: boolean = false): number {
    const maskedAddr = addr & 0xffff;
    let data = 0x00;

    if (maskedAddr < 0x2000) {
      data = this.ram[maskedAddr & 0x07ff];
    } else if (maskedAddr >= 0x8000) {
      data = this.mapper.cpuRead(maskedAddr);
    }

    if (!readOnly) this.record("READ", maskedAddr, data);
    return data & 0xff;
  }

  public write(addr: number, value: number): void {
    const maskedAddr = addr & 0xffff;
    const maskedValue = value & 0xff;

    if (maskedAddr < 0x2000) {
      this.ram[maskedAddr & 0x07ff] = maskedValue;
    } else if (maskedAddr >= 0x8000) {
      this.mapper.cpuWrite(maskedAddr, maskedValue);
    }

    this.record("WRITE", maskedAddr, maskedValue);
  }
}

// ---------- NES CPU Core with Audited Stepping ----------

export class NESCpu implements CPU {
  public a = 0x00;
  public x = 0x00;
  public y = 0x00;
  public p = 0x24;
  public s = 0xfd;
  public pc = 0x0000;
  public cycles = 0;

  private instrSeq = 0;
  private instructionStartCycle = 0;
  private bus: Bus;

  constructor(busFactory: (cpu: NESCpu) => Bus) {
    this.bus = busFactory(this);
  }

  // The CPU provides the offset logic to the bus: (GlobalCycles - StartOfInstruction)
  public getRelativeTick = () => this.cycles - this.instructionStartCycle;

  public setZN(value: number): void {
    const masked = value & 0xff;
    if (masked === 0) {
      this.p |= 0x02;
    } else {
      this.p &= 0xfd;
    }
    if (masked & 0x80) {
      this.p |= 0x80;
    } else {
      this.p &= 0x7f;
    }
  }

  public branchIf(take: boolean, addr?: number): void {
    if (!take || addr === undefined) {
      return;
    }
    this.cycles += 1;
    this.pc = addr & 0xffff;
  }

  private getAddr(mode: AddrMode): AddrResult {
    let addr: number | undefined;
    let operand: number | null = null;
    let pageCrossed = false;

    switch (mode) {
      case "IMM":
        operand = this.bus.read(this.pc);
        addr = this.pc;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      case "ZP":
        addr = this.bus.read(this.pc) & 0xff;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      case "ZPX":
        addr = (this.bus.read(this.pc) + this.x) & 0xff;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      case "ZPY":
        addr = (this.bus.read(this.pc) + this.y) & 0xff;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      case "ABS": {
        const lo = this.bus.read(this.pc);
        const hi = this.bus.read((this.pc + 1) & 0xffff);
        addr = ((hi << 8) | lo) & 0xffff;
        this.pc = (this.pc + 2) & 0xffff;
        break;
      }
      case "ABSX": {
        const lo = this.bus.read(this.pc);
        const hi = this.bus.read((this.pc + 1) & 0xffff);
        const base = ((hi << 8) | lo) & 0xffff;
        addr = (base + this.x) & 0xffff;
        pageCrossed = (base & 0xff00) !== (addr & 0xff00);
        this.pc = (this.pc + 2) & 0xffff;
        break;
      }
      case "ABSY": {
        const lo = this.bus.read(this.pc);
        const hi = this.bus.read((this.pc + 1) & 0xffff);
        const base = ((hi << 8) | lo) & 0xffff;
        addr = (base + this.y) & 0xffff;
        pageCrossed = (base & 0xff00) !== (addr & 0xff00);
        this.pc = (this.pc + 2) & 0xffff;
        break;
      }
      case "IZPX": {
        const zp = (this.bus.read(this.pc) + this.x) & 0xff;
        const lo = this.bus.read(zp);
        const hi = this.bus.read((zp + 1) & 0xff);
        addr = ((hi << 8) | lo) & 0xffff;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }
      case "IZPY": {
        const zp = this.bus.read(this.pc) & 0xff;
        const lo = this.bus.read(zp);
        const hi = this.bus.read((zp + 1) & 0xff);
        const base = ((hi << 8) | lo) & 0xffff;
        addr = (base + this.y) & 0xffff;
        pageCrossed = (base & 0xff00) !== (addr & 0xff00);
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }
      case "REL":
        operand = this.bus.read(this.pc);
        this.pc = (this.pc + 1) & 0xffff;
        {
          const offset = (operand << 24) >> 24;
          const base = this.pc & 0xffff;
          addr = (base + offset) & 0xffff;
          pageCrossed = (base & 0xff00) !== (addr & 0xff00);
        }
        break;
      case "ACC":
      case "IMP":
        break;
      case "IND": {
        const loPtr = this.bus.read(this.pc);
        const hiPtr = this.bus.read((this.pc + 1) & 0xffff);
        const ptr = ((hiPtr << 8) | loPtr) & 0xffff;
        const lo = this.bus.read(ptr);
        const hi = this.bus.read((ptr & 0xff00) | ((ptr + 1) & 0xff));
        addr = ((hi << 8) | lo) & 0xffff;
        this.pc = (this.pc + 2) & 0xffff;
        break;
      }
      default:
        throw new Error(`Unsupported addressing mode: ${mode}`);
    }

    return { addr, pageCrossed, operand };
  }

  public reset(): void {
    this.instructionStartCycle = this.cycles;
    const lo = this.bus.read(0xfffc, true);
    const hi = this.bus.read(0xfffd, true);
    this.pc = ((hi << 8) | lo) & 0xffff;
    this.cycles = 7;
    this.instrSeq = 0;
  }

  /**
   * step() executes one instruction and returns a PSP-compatible fossil.
   */
  public step(): InstructionAudit {
    this.instructionStartCycle = this.cycles;
    this.bus.clearAuditLog();

    // 1. Fetch Opcode (Always at relative offset 0)
    const opcode = this.bus.read(this.pc);
    this.pc = (this.pc + 1) & 0xffff;

    const def = INSTRUCTION_BY_OPCODE.get(opcode);
    let mnemonic = def?.mnemonic ?? "UNK";
    let addr: number | undefined;
    let operand: number | null = null;
    let pageCrossed = false;

    if (def) {
      const addrResult = this.getAddr(def.mode);
      addr = addrResult.addr;
      operand = addrResult.operand;
      pageCrossed = addrResult.pageCrossed;

      def.exec(this, this.bus, addr, operand);
      this.cycles += def.baseCycles;
      if (def.pageCrossAddsCycle && pageCrossed) {
        this.cycles += 1;
      }
    } else {
      this.cycles += 2;
    }

    return {
      seq: this.instrSeq++,
      opcode,
      mnemonic,
      start_cycles: this.instructionStartCycle,
      micro_ops: [...this.bus.getAuditLog()],
      state_after: {
        a: this.a,
        x: this.x,
        y: this.y,
        p: this.p,
        s: this.s,
        pc: this.pc,
        cycles: this.cycles
      }
    };
  }
}
