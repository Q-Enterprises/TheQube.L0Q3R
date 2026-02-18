export interface Mapper {
  cpuRead(addr: number): number;
  cpuWrite(addr: number, value: number): void;
  // PPU read/write would go here too, but can be deferred.
}
