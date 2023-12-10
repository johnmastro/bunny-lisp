import { Op } from "./opcodes.ts";

interface IInstruction<T extends Op> {
    readonly op: T;
}

export class InstructionNop implements IInstruction<Op.nop> {
    readonly op = Op.nop;
}

export class InstructionDup implements IInstruction<Op.dup> {
    readonly op = Op.dup;
}

export class InstructionPop implements IInstruction<Op.pop> {
    readonly op = Op.pop;
}

export class InstructionRet implements IInstruction<Op.ret> {
    readonly op = Op.ret;
}

export class InstructionCall implements IInstruction<Op.call> {
    readonly op = Op.call;
    constructor(readonly nargs: number) {}
}

export class InstructionLabel implements IInstruction<Op.label> {
    readonly op = Op.label;
    constructor(readonly id: number) {}
}

export class InstructionJump implements IInstruction<Op.jump> {
    readonly op = Op.jump;
    constructor(readonly target: number) {}
}

export class InstructionJumpIfNot implements IInstruction<Op.jump_if_not> {
    readonly op = Op.jump_if_not;
    constructor(readonly target: number) {}
}

export class InstructionConst implements IInstruction<Op.const> {
    readonly op = Op.const;
    constructor(readonly index: number) {}
}

export class InstructionDef implements IInstruction<Op.def> {
    readonly op = Op.def;
}

export class InstructionLoad implements IInstruction<Op.load> {
    readonly op = Op.load;
}

export class InstructionStore implements IInstruction<Op.store> {
    readonly op = Op.store;
}

export class InstructionClosure implements IInstruction<Op.closure> {
    readonly op = Op.closure;
}

export class InstructionHalt implements IInstruction<Op.halt> {
    readonly op = Op.halt;
}

export type Instruction =
    | InstructionNop
    | InstructionDup
    | InstructionPop
    | InstructionRet
    | InstructionCall
    | InstructionLabel
    | InstructionJump
    | InstructionJumpIfNot
    | InstructionConst
    | InstructionDef
    | InstructionLoad
    | InstructionStore
    | InstructionClosure
    | InstructionHalt;
