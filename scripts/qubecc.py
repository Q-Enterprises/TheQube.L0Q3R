#!/usr/bin/env python3
"""QUBE bytecode compiler/disassembler.

This module defines a canonical instruction table (OP_ARITY) and a
centralized decoder (decode_at) so disassembly and any future VM trace
logic share a single source of truth.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple


OP_ARITY = {
    "HALT": 0,
    "PUSH": 1,
    "POP": 0,
    "DUP": 0,
    "ADD": 0,
    "SUB": 0,
    "MUL": 0,
    "DIV": 0,
    "PRINT": 0,
    "JMP": 1,
    "JZ": 1,
    "LOAD": 1,
    "STORE": 1,
}

OPCODE_BY_MNEMONIC = {
    "HALT": 0x00,
    "PUSH": 0x01,
    "POP": 0x02,
    "DUP": 0x03,
    "ADD": 0x04,
    "SUB": 0x05,
    "MUL": 0x06,
    "DIV": 0x07,
    "PRINT": 0x08,
    "JMP": 0x09,
    "JZ": 0x0A,
    "LOAD": 0x0B,
    "STORE": 0x0C,
}

MNEMONIC_BY_OPCODE = {value: key for key, value in OPCODE_BY_MNEMONIC.items()}


class DecodeError(RuntimeError):
    pass


def decode_at(bytecode: Sequence[int], index: int) -> Tuple[int, str, List[int]]:
    if index >= len(bytecode):
        raise DecodeError(f"Truncated instruction at {index}")

    opcode = bytecode[index]
    mnemonic = MNEMONIC_BY_OPCODE.get(opcode)
    if mnemonic is None:
        raise RuntimeError(f"Unknown opcode 0x{opcode:02x} at {index}")

    arity = OP_ARITY[mnemonic]
    operand_start = index + 1
    operand_end = operand_start + arity
    if operand_end > len(bytecode):
        if mnemonic == "PUSH":
            raise RuntimeError("Truncated PUSH")
        raise RuntimeError(f"Truncated {mnemonic}")

    operands = list(bytecode[operand_start:operand_end])
    return operand_end, mnemonic, operands


def disassemble(bytecode: Sequence[int]) -> List[str]:
    lines: List[str] = []
    index = 0
    while index < len(bytecode):
        next_index, mnemonic, operands = decode_at(bytecode, index)
        if operands:
            operand_text = " ".join(str(value) for value in operands)
            line = f"{index:04d}: {mnemonic} {operand_text}"
        else:
            line = f"{index:04d}: {mnemonic}"
        lines.append(line)
        index = next_index
    return lines


def parse_int(token: str) -> int:
    try:
        value = int(token, 0)
    except ValueError as exc:
        raise ValueError(f"Invalid integer literal: {token}") from exc
    if not 0 <= value <= 255:
        raise ValueError(f"Byte value out of range (0-255): {token}")
    return value


def parse_source_lines(lines: Iterable[str]) -> List[int]:
    bytecode: List[int] = []
    for raw_line in lines:
        line = raw_line.split("#", 1)[0].split("//", 1)[0].strip()
        if not line:
            continue
        tokens = line.split()
        mnemonic = tokens[0].upper()
        if mnemonic not in OP_ARITY:
            raise RuntimeError(f"Unknown mnemonic: {mnemonic}")
        operands = [parse_int(token) for token in tokens[1:]]
        expected = OP_ARITY[mnemonic]
        if len(operands) != expected:
            raise RuntimeError(
                f"{mnemonic} expects {expected} operand(s), got {len(operands)}"
            )
        bytecode.append(OPCODE_BY_MNEMONIC[mnemonic])
        bytecode.extend(operands)
    return bytecode


def load_bytecode(path: Path) -> List[int]:
    if path.suffix in {".qbc", ".bytecode", ".bin"}:
        return list(path.read_bytes())
    return parse_source_lines(path.read_text(encoding="utf-8").splitlines())


def main() -> int:
    parser = argparse.ArgumentParser(description="QUBE compiler/disassembler")
    parser.add_argument("source", type=Path, help="Source or bytecode file")
    parser.add_argument(
        "--emit-bytecode",
        action="store_true",
        help="Emit machine-grade JSON bytecode",
    )
    parser.add_argument(
        "--disasm",
        action="store_true",
        help="Emit human-grade disassembly",
    )
    args = parser.parse_args()

    bytecode = load_bytecode(args.source)

    if args.emit_bytecode:
        print(json.dumps(bytecode))
    if args.disasm:
        for line in disassemble(bytecode):
            print(line)

    if not args.emit_bytecode and not args.disasm:
        parser.error("Must specify --emit-bytecode or --disasm")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
