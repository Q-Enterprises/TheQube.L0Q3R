export interface Bus {
  read(addr: number): number; // 0x0000–0xFFFF
  write(addr: number, value: number): void;
}
