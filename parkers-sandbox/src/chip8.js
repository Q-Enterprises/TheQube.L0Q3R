export class Chip8 {
  constructor({ drawPixel } = {}) {
    this.memory = new Uint8Array(4096);
    this.v = new Uint8Array(16);
    this.i = 0;
    this.pc = 0x200;
    this.stack = new Uint16Array(16);
    this.sp = 0;
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.display = new Uint8Array(64 * 32);
    this.keys = new Array(16).fill(false);
    this.drawPixel = drawPixel || (() => {});
    this.lastTimerUpdate = performance.now();
  }

  loadRom(bytes) {
    this.memory.fill(0);
    this.v.fill(0);
    this.i = 0;
    this.pc = 0x200;
    this.stack.fill(0);
    this.sp = 0;
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.display.fill(0);
    for (let idx = 0; idx < bytes.length; idx += 1) {
      this.memory[0x200 + idx] = bytes[idx];
    }
    this.renderFullFrame();
  }

  keyDown(key) {
    this.keys[key] = true;
  }

  keyUp(key) {
    this.keys[key] = false;
  }

  cycle() {
    const opcode = (this.memory[this.pc] << 8) | this.memory[this.pc + 1];
    this.pc += 2;
    this.execute(opcode);
    this.updateTimers();
  }

  updateTimers() {
    const now = performance.now();
    if (now - this.lastTimerUpdate >= 16) {
      if (this.delayTimer > 0) {
        this.delayTimer -= 1;
      }
      if (this.soundTimer > 0) {
        this.soundTimer -= 1;
      }
      this.lastTimerUpdate = now;
    }
  }

  execute(opcode) {
    const nnn = opcode & 0x0fff;
    const n = opcode & 0x000f;
    const x = (opcode & 0x0f00) >> 8;
    const y = (opcode & 0x00f0) >> 4;
    const kk = opcode & 0x00ff;

    switch (opcode & 0xf000) {
      case 0x0000:
        if (opcode === 0x00e0) {
          this.display.fill(0);
          this.renderFullFrame();
        } else if (opcode === 0x00ee) {
          this.sp -= 1;
          this.pc = this.stack[this.sp];
        }
        break;
      case 0x1000:
        this.pc = nnn;
        break;
      case 0x2000:
        this.stack[this.sp] = this.pc;
        this.sp += 1;
        this.pc = nnn;
        break;
      case 0x3000:
        if (this.v[x] === kk) {
          this.pc += 2;
        }
        break;
      case 0x5000:
        if (this.v[x] === this.v[y]) {
          this.pc += 2;
        }
        break;
      case 0x6000:
        this.v[x] = kk;
        break;
      case 0x7000:
        this.v[x] = (this.v[x] + kk) & 0xff;
        break;
      case 0xa000:
        this.i = nnn;
        break;
      case 0xd000:
        this.drawSprite(x, y, n);
        break;
      case 0xe000:
        if (kk === 0x9e) {
          if (this.keys[this.v[x]]) {
            this.pc += 2;
          }
        } else if (kk === 0xa1) {
          if (!this.keys[this.v[x]]) {
            this.pc += 2;
          }
        }
        break;
      case 0xf000:
        if (kk === 0x15) {
          this.delayTimer = this.v[x];
        } else if (kk === 0x18) {
          this.soundTimer = this.v[x];
        }
        break;
      default:
        break;
    }
  }

  drawSprite(xRegister, yRegister, height) {
    const xPos = this.v[xRegister] % 64;
    const yPos = this.v[yRegister] % 32;
    this.v[0xf] = 0;

    for (let row = 0; row < height; row += 1) {
      const spriteByte = this.memory[this.i + row];
      for (let col = 0; col < 8; col += 1) {
        const spritePixel = (spriteByte >> (7 - col)) & 1;
        if (!spritePixel) {
          continue;
        }
        const x = (xPos + col) % 64;
        const y = (yPos + row) % 32;
        const idx = x + y * 64;
        if (this.display[idx] === 1) {
          this.v[0xf] = 1;
        }
        this.display[idx] ^= 1;
        this.drawPixel(x, y, this.display[idx] === 1);
      }
    }
  }

  renderFullFrame() {
    for (let y = 0; y < 32; y += 1) {
      for (let x = 0; x < 64; x += 1) {
        const idx = x + y * 64;
        this.drawPixel(x, y, this.display[idx] === 1);
      }
    }
  }
}
