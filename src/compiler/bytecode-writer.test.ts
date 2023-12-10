import { describe, test, expect } from "bun:test";
import {
    InstructionConst,
    InstructionJump,
    InstructionJumpIfNot,
    InstructionLabel,
    InstructionRet,
} from "./instructions.ts";
import { BytecodeWriter } from "./bytecode-writer.ts";

describe("BytecodeWriter", () => {
    test("it works", () => {
        //                             (label 0)  (label 1)
        // (do (if (const 1) (const 2) (const 3)) (const 4))
        const writer = new BytecodeWriter();
        writer.writeAll([
            new InstructionConst(1),
            new InstructionJumpIfNot(0),
            new InstructionConst(2),
            new InstructionJump(1),
            new InstructionLabel(0),
            new InstructionConst(3),
            new InstructionLabel(1),
            new InstructionConst(4),
            new InstructionRet(),
        ]);
        const result = writer.bytecode();
        expect(result).toStrictEqual(
            new Uint16Array([
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
            ]),
        );
    });
});
