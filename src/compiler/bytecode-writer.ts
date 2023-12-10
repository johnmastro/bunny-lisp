import { Instruction } from "./instructions.ts";
import { Op, OpToOpInfoMap } from "./opcodes.ts";
import { assertUnreachable, BunnyInvalidStateError } from "../errors.ts";

export function write(instructions: Instruction[]): Uint16Array {
    const writer = new BytecodeWriter();
    writer.writeAll(instructions);
    return writer.bytecode();
}

export class BytecodeWriter {
    private readonly instructions: Instruction[] = [];

    write(instruction: Instruction): void {
        this.instructions.push(instruction);
    }

    writeAll(instructions: Instruction[]): void {
        for (const instruction of instructions) {
            this.write(instruction);
        }
    }

    bytecode(): Uint16Array {
        const result: number[] = [];
        result.push(0); // Save a place for maxstack
        const labels = new Map<number, number>(); // Label -> location
        const fixups = new Map<number, number>(); // Fixup -> label
        let stackSize = 0;
        let maxStackSize = 0;
        for (const instruction of this.instructions) {
            const opInfo = OpToOpInfoMap[instruction.op];
            const byte = opInfo.code;
            stackSize += opInfo.stackEffect;
            maxStackSize = Math.max(stackSize, maxStackSize);
            switch (instruction.op) {
                case Op.label:
                    labels.set(instruction.id, result.length);
                    break;
                case Op.nop:
                case Op.dup:
                case Op.pop:
                case Op.ret:
                case Op.def:
                case Op.load:
                case Op.store:
                case Op.closure:
                case Op.halt: {
                    result.push(byte);
                    break;
                }
                case Op.call: {
                    result.push(byte);
                    result.push(instruction.nargs);
                    break;
                }
                case Op.jump:
                case Op.jump_if_not: {
                    result.push(byte);
                    fixups.set(result.length, instruction.target);
                    result.push(instruction.target);
                    break;
                }
                case Op.const: {
                    result.push(byte);
                    result.push(instruction.index);
                    break;
                }
                default:
                    assertUnreachable(instruction);
            }
        }
        result[0] = maxStackSize;
        const fixedUp = fixup(result, labels, fixups);
        return new Uint16Array(fixedUp);
    }
}

function fixup(
    code: number[],
    labels: Map<number, number>,
    fixups: Map<number, number>,
): number[] {
    const result = [...code];
    for (const [fixupLocation, label] of fixups) {
        const targetLocation: number | undefined = labels.get(label);
        if (typeof targetLocation !== "number") {
            throw new BunnyInvalidStateError(`Not a valid label ID: ${label}`);
        }
        result[fixupLocation] = targetLocation;
    }
    return result;
}
