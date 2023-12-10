import {
    Instruction,
    InstructionCall,
    InstructionClosure,
    InstructionConst,
    InstructionDef,
    InstructionDup,
    InstructionHalt,
    InstructionJump,
    InstructionJumpIfNot,
    InstructionLabel,
    InstructionLoad,
    InstructionNop,
    InstructionPop,
    InstructionRet,
    InstructionStore,
} from "../compiler/instructions.ts";
import { Opcode, opcodes, OpcodeToOpInfoMap, Op } from "../compiler/opcodes.ts";
import { BunnyIndexError, BunnyInvalidStateError } from "../errors.ts";

export class InstructionReader {
    private pos: number = 1; // Position zero is maxstack

    constructor(
        private readonly code: Uint16Array,
        pos?: number,
    ) {
        if (typeof pos === "number") {
            this.seek(pos);
        }
    }

    next(): Instruction {
        const opcode = this.readOrFail();
        const operation = this.getOperation(opcode);
        switch (operation) {
            case Op.nop:
                return new InstructionNop();
            case Op.dup:
                return new InstructionDup();
            case Op.pop:
                return new InstructionPop();
            case Op.ret:
                return new InstructionRet();
            case Op.call: {
                const nargs = this.readOrFail();
                return new InstructionCall(nargs);
            }
            case Op.label: {
                const target = this.readOrFail();
                return new InstructionLabel(target);
            }
            case Op.jump: {
                const target = this.readOrFail();
                return new InstructionJump(target);
            }
            case Op.jump_if_not: {
                const target = this.readOrFail();
                return new InstructionJumpIfNot(target);
            }
            case Op.const: {
                const index = this.readOrFail();
                return new InstructionConst(index);
            }
            case Op.def:
                return new InstructionDef();
            case Op.load:
                return new InstructionLoad();
            case Op.store:
                return new InstructionStore();
            case Op.closure:
                return new InstructionClosure();
            case Op.halt:
                return new InstructionHalt();
        }
    }

    seek(pos: number): void {
        if (pos < 1 || pos >= this.code.length) {
            throw new BunnyIndexError(`Invalid reader position: ${pos}`);
        }
        this.pos = pos;
    }

    get position(): number {
        return this.pos;
    }

    get maxStack(): number {
        if (this.code.length === 0) {
            throw new BunnyInvalidStateError("Off the end of the code :(");
        }
        return this.code[0]!;
    }

    private readOrFail(): number {
        if (this.pos >= this.code.length) {
            throw new BunnyInvalidStateError("Off the end of the code :(");
        }
        return this.code[this.pos++]!;
    }

    private getOperation(opcode: number): Op {
        if (this.isOpcode(opcode)) {
            return OpcodeToOpInfoMap[opcode].op;
        }
        throw new BunnyInvalidStateError(`Invalid opcode ${opcode}`);
    }

    private isOpcode(opcode: number): opcode is Opcode {
        return (opcodes as readonly number[]).includes(opcode);
    }
}
