export enum Op {
    nop = "nop",
    dup = "dup",
    pop = "pop",
    ret = "ret",
    call = "call",
    label = "label",
    jump = "jump",
    jump_if_not = "jump_if_not",
    const = "const",
    def = "def",
    load = "load",
    store = "store",
    closure = "closure",
    halt = "halt",
}

export const opcodes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;
export type Opcode = (typeof opcodes)[number];

export interface OpInfo {
    op: Op;
    code: Opcode;
    nargs: number;
    stackEffect: number;
}

const opNopInfo: OpInfo = { op: Op.nop, code: 0, nargs: 0, stackEffect: 0 };
const opDupInfo: OpInfo = { op: Op.dup, code: 1, nargs: 0, stackEffect: 1 };
const opPopInfo: OpInfo = { op: Op.pop, code: 2, nargs: 0, stackEffect: -1 };
const opRetInfo: OpInfo = { op: Op.ret, code: 3, nargs: 0, stackEffect: -1 };
const opCallInfo: OpInfo = { op: Op.call, code: 4, nargs: 1, stackEffect: 0 };
const opLabelInfo: OpInfo = { op: Op.label, code: 5, nargs: 1, stackEffect: 0 };
const opJumpInfo: OpInfo = { op: Op.jump, code: 6, nargs: 1, stackEffect: 0 };
const opJumpIfNotInfo: OpInfo = {
    op: Op.jump_if_not,
    code: 7,
    nargs: 1,
    stackEffect: -1,
};
const opConstInfo: OpInfo = { op: Op.const, code: 8, nargs: 1, stackEffect: 1 };
const opDefInfo: OpInfo = { op: Op.def, code: 9, nargs: 0, stackEffect: 0 };
const opLoadInfo: OpInfo = { op: Op.load, code: 10, nargs: 0, stackEffect: 0 };
const opStoreInfo: OpInfo = {
    op: Op.store,
    code: 11,
    nargs: 0,
    stackEffect: 0,
};
const opClosureInfo: OpInfo = {
    op: Op.closure,
    code: 12,
    nargs: 0,
    stackEffect: 0,
};
const opHaltInfo: OpInfo = { op: Op.halt, code: 13, nargs: 0, stackEffect: 0 };

export const OpToOpInfoMap: Record<Op, OpInfo> = {
    [Op.nop]: opNopInfo,
    [Op.dup]: opDupInfo,
    [Op.pop]: opPopInfo,
    [Op.ret]: opRetInfo,
    [Op.call]: opCallInfo,
    [Op.label]: opLabelInfo,
    [Op.jump]: opJumpInfo,
    [Op.jump_if_not]: opJumpIfNotInfo,
    [Op.const]: opConstInfo,
    [Op.def]: opDefInfo,
    [Op.load]: opLoadInfo,
    [Op.store]: opStoreInfo,
    [Op.closure]: opClosureInfo,
    [Op.halt]: opHaltInfo,
};

export const OpcodeToOpInfoMap: Record<Opcode, OpInfo> = {
    0: opNopInfo,
    1: opDupInfo,
    2: opPopInfo,
    3: opRetInfo,
    4: opCallInfo,
    5: opLabelInfo,
    6: opJumpInfo,
    7: opJumpIfNotInfo,
    8: opConstInfo,
    9: opDefInfo,
    10: opLoadInfo,
    11: opStoreInfo,
    12: opClosureInfo,
    13: opHaltInfo,
};
