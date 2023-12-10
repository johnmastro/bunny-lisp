import { describe, test, expect } from "bun:test";
import { InstructionReader } from "./instruction-reader.ts";
import {
    InstructionConst,
    InstructionJump,
    InstructionJumpIfNot,
    InstructionRet,
} from "../compiler/instructions.ts";

describe("InstructionReader", () => {
    const code = new Uint16Array([
        3, // 0: maxstack
        8, // 1: const
        1, // 2: const index
        7, // 3: jump if not
        9, // 4: jump target (label 0)
        8, // 5: const
        2, // 6: const index
        6, // 7: jump
        11, // 8: jump target (label 1)
        8, // 9: const (label 0)
        3, // 10: const index
        8, // 11: const (label 1)
        4, // 12: const index
        3, // 13: ret
    ]);
    const reader = new InstructionReader(code);
    test("maxstack", () => {
        const result = reader.maxStack;
        expect(result).toBe(3);
    });
    test("instructions", () => {
        expect(reader.next()).toStrictEqual(new InstructionConst(1));
        expect(reader.next()).toStrictEqual(new InstructionJumpIfNot(9));
        expect(reader.next()).toStrictEqual(new InstructionConst(2));
        expect(reader.next()).toStrictEqual(new InstructionJump(11));
        expect(reader.next()).toStrictEqual(new InstructionConst(3));
        expect(reader.next()).toStrictEqual(new InstructionConst(4));
        expect(reader.next()).toStrictEqual(new InstructionRet());
        const testFail = () => reader.next();
        expect(testFail).toThrow();
    });
});
