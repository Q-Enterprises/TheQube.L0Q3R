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

    let mnemonic = "UNK";

    // 2. Decode & Execute
    // Note: Cycles are incremented as per hardware documentation
    switch (opcode) {
      case 0xa9: // LDA Immediate
        mnemonic = "LDA";
        this.a = this.bus.read(this.pc);
        this.pc = (this.pc + 1) & 0xffff;
        this.cycles += 2;
        break;
      case 0xea: // NOP
        mnemonic = "NOP";
        this.cycles += 2;
        break;
      // Additional opcodes would expand the audit stream here
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
