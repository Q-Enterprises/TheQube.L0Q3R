export interface CPU {
  A: number;
  X: number;
  Y: number;
  P: number; // status
  S: number; // stack pointer
  PC: number; // program counter
}
