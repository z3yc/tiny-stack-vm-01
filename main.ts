// A tiny stack VM for make.fun's ISA v1: runs every program of a set and
// writes each one's stdout and exit code. Node 22, standard library only.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function run(prog: Uint8Array, input: Uint8Array): { out: Uint8Array; exit: number } {
  const n = prog.length;
  const S = new Int32Array(256);
  const C = new Int32Array(64);
  const M = new Int32Array(256);
  const out = new Uint8Array(65536);
  let sp = 0, cp = 0, pc = 0, steps = 0, ip = 0, ol = 0;
  const end = (exit: number) => ({ out: out.slice(0, ol), exit });

  for (;;) {
    if (steps === 1000000) return end(10);
    if (pc < 0 || pc >= n) return end(9);
    const op = prog[pc];
    let imm = 0, pops = 0, pushes = 0;
    switch (op) {
      case 0x00: break;
      case 0x01: imm = 1; pushes = 1; break;
      case 0x02: imm = 4; pushes = 1; break;
      case 0x03: pops = 1; break;
      case 0x04: pops = 1; pushes = 2; break;
      case 0x05: pops = 2; pushes = 2; break;
      case 0x06: pops = 2; pushes = 3; break;
      case 0x07: pops = 3; pushes = 3; break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15:
      case 0x16: case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d:
      case 0x1e: case 0x20: case 0x21: case 0x22: pops = 2; pushes = 1; break;
      case 0x17: case 0x1b: pops = 1; pushes = 1; break;
      case 0x30: imm = 2; break;
      case 0x31: case 0x32: imm = 2; pops = 1; break;
      case 0x33: imm = 2; break;
      case 0x34: break;
      case 0x40: pops = 1; pushes = 1; break;
      case 0x41: pops = 2; break;
      case 0x50: case 0x51: case 0x53: pops = 1; break;
      case 0x52: pushes = 1; break;
      default: return end(5);
    }
    if (pc + imm >= n) return end(9);
    steps++;
    const next = pc + 1 + imm;
    if (sp < pops) return end(2);
    if (sp - pops + pushes > 256) return end(3);
    pc = next;
    switch (op) {
      case 0x00: return end(0);
      case 0x01: S[sp++] = (prog[next - 1] << 24) >> 24; break;
      case 0x02: S[sp++] = prog[next - 4] | (prog[next - 3] << 8) | (prog[next - 2] << 16) | (prog[next - 1] << 24); break;
      case 0x03: sp--; break;
      case 0x04: S[sp] = S[sp - 1]; sp++; break;
      case 0x05: { const t = S[sp - 1]; S[sp - 1] = S[sp - 2]; S[sp - 2] = t; break; }
      case 0x06: S[sp] = S[sp - 2]; sp++; break;
      case 0x07: { const a = S[sp - 3]; S[sp - 3] = S[sp - 2]; S[sp - 2] = S[sp - 1]; S[sp - 1] = a; break; }
      case 0x17: S[sp - 1] = -S[sp - 1] | 0; break;
      case 0x1b: S[sp - 1] = ~S[sp - 1]; break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15:
      case 0x16: case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d:
      case 0x1e: case 0x20: case 0x21: case 0x22: {
        const b = S[sp - 1], a = S[sp - 2];
        let r = 0;
        switch (op) {
          case 0x10: r = (a + b) | 0; break;
          case 0x11: r = (a - b) | 0; break;
          case 0x12: r = Math.imul(a, b); break;
          case 0x13: if (b === 0) return end(4); r = a === -2147483648 && b === -1 ? a : (a / b) | 0; break;
          case 0x14: if (b === 0) return end(4); r = b === -1 ? 0 : (a % b) | 0; break;
          case 0x15: if (b === 0) return end(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; break;
          case 0x16: if (b === 0) return end(4); r = ((a >>> 0) % (b >>> 0)) | 0; break;
          case 0x18: r = a & b; break;
          case 0x19: r = a | b; break;
          case 0x1a: r = a ^ b; break;
          case 0x1c: r = a << (b & 31); break;
          case 0x1d: r = a >> (b & 31); break;
          case 0x1e: r = (a >>> (b & 31)) | 0; break;
          case 0x20: r = a === b ? 1 : 0; break;
          case 0x21: r = a < b ? 1 : 0; break;
          case 0x22: r = (a >>> 0) < (b >>> 0) ? 1 : 0; break;
        }
        sp -= 2;
        S[sp++] = r;
        break;
      }
      case 0x30: case 0x31: case 0x32: {
        const rel = ((prog[next - 2] | (prog[next - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 0x30) { const v = S[--sp]; take = op === 0x31 ? v === 0 : v !== 0; }
        if (take) pc = next + rel;
        break;
      }
      case 0x33:
        if (cp === 64) return end(7);
        C[cp++] = next;
        pc = prog[next - 2] | (prog[next - 1] << 8);
        break;
      case 0x34:
        if (cp === 0) return end(8);
        pc = C[--cp];
        break;
      case 0x40: {
        const addr = S[sp - 1];
        if (addr < 0 || addr >= 256) return end(6);
        S[sp - 1] = M[addr];
        break;
      }
      case 0x41: {
        const addr = S[sp - 1], v = S[sp - 2];
        if (addr < 0 || addr >= 256) return end(6);
        sp -= 2;
        M[addr] = v;
        break;
      }
      case 0x50: {
        const bytes = Buffer.from(String(S[sp - 1]), 'ascii');
        if (ol + bytes.length > 65536) return end(11);
        sp--;
        out.set(bytes, ol);
        ol += bytes.length;
        break;
      }
      case 0x51:
        if (ol + 1 > 65536) return end(11);
        out[ol++] = S[--sp] & 255;
        break;
      case 0x52: S[sp++] = ip < input.length ? input[ip++] : -1; break;
      case 0x53: return end(S[--sp] & 255);
    }
  }
}

function read(p: string): Uint8Array {
  try { return new Uint8Array(readFileSync(p)); } catch { return new Uint8Array(0); }
}

for (const id of readdirSync(I).sort()) {
  const dir = join(O, id);
  mkdirSync(dir, { recursive: true });
  let r = { out: new Uint8Array(0), exit: 0 };
  try {
    r = run(read(join(I, id, 'program.bin')), read(join(I, id, 'input.bin')));
  } catch { /* keep the empty answer rather than failing the whole set */ }
  writeFileSync(join(dir, 'stdout.bin'), r.out);
  writeFileSync(join(dir, 'exit.txt'), String(r.exit) + '\n');
}
