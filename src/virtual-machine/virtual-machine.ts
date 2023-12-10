import {
    BunnyClosure,
    BunnyIntrinsic,
    BunnyList,
    BunnyObject,
    BunnySymbol,
    BunnyType,
    Environment,
    FALSE,
    IVirtualMachine,
    NIL,
} from "../data.ts";
import { InstructionReader } from "./instruction-reader.ts";
import { Op } from "../compiler/opcodes.ts";
import {
    maybeGrow,
    getClosure,
    getEnvironment,
    getFunction,
    getNumber,
    getObject,
    getObjects,
    StackElement,
    reset,
} from "./stack.ts";
import {
    assertUnreachable,
    BunnyArgumentError,
    BunnyInvalidStateError,
    BunnyNameError,
} from "../errors.ts";
import * as compiler from "../compiler/compiler.ts";
import { Reader, EOF } from "../reader/reader.ts";
import { intrinsics } from "../intrinsics.ts";
import * as symbolTable from "../reader/symbol-table.ts";
import { debug } from "../debug.ts";

export class VirtualMachine implements IVirtualMachine {
    private sp = 0;
    private currentFrame = 0;
    private readonly stack: StackElement[] = [];
    private readonly globals = VirtualMachine.intrinsicsEnvironment();

    apply(fn: BunnyClosure, args: BunnyObject[]): BunnyObject {
        debug("APPLY", { fn: fn.name, args });
        const savedSp = this.sp;
        const nargs = args.length;
        this.stack[this.sp++] = fn;
        for (let i = 0; i < nargs; i++) {
            this.stack[this.sp++] = args[i]!;
        }
        const result = this.exec(nargs);
        this.sp = savedSp;
        return result;
    }

    compileFunction(form: BunnyObject): BunnyClosure {
        return compiler.compileFunction(this, form);
    }

    compileThunk(form: BunnyObject): BunnyClosure {
        return compiler.compileThunk(this, form);
    }

    macroexpand(form: BunnyObject): BunnyObject {
        return compiler.macroexpand(this, form);
    }

    loadFile(file: string): BunnyObject | null {
        const reader = Reader.fromFile(file);
        return this.loadFromReader(reader);
    }

    loadString(str: string): BunnyObject | null {
        const reader = Reader.fromString(str);
        return this.loadFromReader(reader);
    }

    lookupGlobal(symbol: BunnySymbol): BunnyObject | null {
        return this.globals.get(symbol);
    }

    storeGlobals(bindings: Iterable<[BunnySymbol, BunnyObject]>): void {
        for (const [sym, obj] of bindings) {
            this.globals.def(sym, obj);
        }
    }

    reset(): void {
        reset(this.stack, 256);
        this.sp = 0;
        this.currentFrame = 0;
    }

    private exec(nargs: number): BunnyObject {
        const initialFrame = this.currentFrame;
        let ip = 1;

        top: for (;;) {
            let bp = this.sp - nargs - 1;
            let fn = getClosure(this.stack, bp);

            if (nargs < fn.nPositional) {
                throw new BunnyArgumentError("few");
            }
            if (nargs > fn.nPositional && !fn.isVariadic) {
                throw new BunnyArgumentError("many");
            }

            debug("ENTER", { fn: fn.name, ip, code: fn.code });

            let instructions = new InstructionReader(fn.code, ip);
            maybeGrow(this.stack, this.sp + instructions.maxStack + 1);

            const env = this.snarfArgs(fn, bp + 1, nargs);
            this.sp -= nargs;
            this.stack[this.sp++] = env;
            this.stack[this.sp++] = this.currentFrame;
            this.stack[this.sp++] = 0; // Return address
            this.currentFrame = this.sp;

            for (;;) {
                const instruction = instructions.next();
                debug("OP", { fn: fn.name, op: instruction.op });
                switch (instruction.op) {
                    case Op.nop:
                    case Op.dup:
                    case Op.label:
                    case Op.halt:
                        throw new BunnyInvalidStateError(
                            `We never actually emit ${instruction.op}, very sus!`,
                        );
                    case Op.pop:
                        this.sp--;
                        break;
                    case Op.ret: {
                        // The return value is at the top of the stack
                        const result = getObject(this.stack, this.sp - 1);
                        // Reset sp (we're done with any temporary values up there)
                        this.sp = this.currentFrame;
                        // Reset currentFrame to the *previous* frame we're returning to
                        this.currentFrame = this.currentFramePrevious;
                        // We might be done here...
                        if (this.currentFrame === initialFrame) {
                            return result;
                        }
                        // Otherwise, move sp below the return address, frame pointer,
                        // and env (so it's pointing at the function we're in)
                        this.sp -= 3;
                        // Find the instruction pointer and base pointer for this frame
                        ip = this.currentFrameReturnAddress;
                        bp = this.currentFrameBasePointer;
                        // Replace the completed function with the return value
                        this.stack[this.sp - 1] = result;
                        // Get a reference to the function we're returning to and resume
                        // reading its instructions based on the return address
                        debug("RET", {
                            from: fn.name,
                            to: this.currentFrameFunction.name,
                            ip,
                            val: result,
                        });
                        fn = this.currentFrameFunction;
                        instructions = new InstructionReader(fn.code, ip);
                        break;
                    }
                    case Op.call: {
                        // The function is below whatever arguments we were called with
                        const callable = getFunction(
                            this.stack,
                            this.sp - instruction.nargs - 1,
                        );
                        // If it's an intrinsic, we just get the values off the stack,
                        // call it, and replace all of them with the result
                        if (callable.type === BunnyType.intrinsic) {
                            const args = getObjects(
                                this.stack,
                                this.sp - instruction.nargs,
                                this.sp,
                            );
                            const result = callable.value(this, args);
                            this.sp -= instruction.nargs;
                            this.stack[this.sp - 1] = result;
                            debug("INTRINSIC", {
                                fn: callable.name,
                                args,
                                result,
                            });
                            break;
                        }
                        // It's a closure, so save our return address and jump to the
                        // top to start executing it
                        debug("CALL", {
                            from: fn.name,
                            to: callable.name,
                            nargs: instruction.nargs,
                        });
                        this.stack[this.currentFrame - 1] = instructions.position;
                        nargs = instruction.nargs;
                        ip = 1;
                        continue top;
                    }
                    case Op.jump:
                        instructions.seek(instruction.target);
                        break;
                    case Op.jump_if_not: {
                        const val = getObject(this.stack, this.sp - 1);
                        if (val === FALSE || val === NIL) {
                            instructions.seek(instruction.target);
                        }
                        break;
                    }
                    case Op.const: {
                        const val = fn.constants[instruction.index];
                        debug("CONST", {
                            index: instruction.index,
                            val,
                        });
                        if (!val) {
                            throw new BunnyInvalidStateError("Invalid const index");
                        }
                        this.stack[this.sp++] = val;
                        break;
                    }
                    case Op.load: {
                        const sym = getObject(this.stack, this.sp - 1);
                        if (!(sym instanceof BunnySymbol)) {
                            throw new BunnyInvalidStateError(
                                "Attempting to load from non-symbol",
                            );
                        }
                        const env = this.currentFrameEnv;
                        const val = this.load(env, sym);
                        this.stack[this.sp - 1] = val;
                        break;
                    }
                    case Op.def:
                    case Op.store: {
                        const sym = getObject(this.stack, this.sp - 2);
                        if (!(sym instanceof BunnySymbol)) {
                            throw new BunnyInvalidStateError(
                                "Attempting to load from non-symbol",
                            );
                        }
                        const val = getObject(this.stack, this.sp - 1);
                        if (instruction.op === Op.def) {
                            this.globals.def(sym, val);
                        } else {
                            const env = this.currentFrameEnv;
                            this.store(env, sym, val);
                        }
                        this.sp--;
                        this.stack[this.sp - 1] = val;
                        break;
                    }
                    case Op.closure: {
                        const c = getClosure(this.stack, this.sp - 1);
                        this.stack[this.sp - 1] = this.captureEnclosingEnvironment(
                            c,
                            initialFrame,
                        );
                        break;
                    }
                    default:
                        assertUnreachable(instruction);
                }
            }
        }
    }

    private get currentFrameReturnAddress(): number {
        return getNumber(this.stack, this.currentFrame - 1);
    }

    private get currentFramePrevious(): number {
        return getNumber(this.stack, this.currentFrame - 2);
    }

    private get currentFrameEnv(): Environment {
        return getEnvironment(this.stack, this.currentFrame - 3);
    }

    private get currentFrameBasePointer(): number {
        return this.currentFrame - 4;
    }

    private get currentFrameFunction(): BunnyClosure {
        return getClosure(this.stack, this.currentFrameBasePointer);
    }

    private snarfArgs(fn: BunnyClosure, pos: number, nargs: number): Environment {
        const bindings: [BunnySymbol, BunnyObject][] = [];
        let i = 0;
        for (; i < fn.nPositional; i++) {
            const sym = fn.constants[i];
            if (!(sym instanceof BunnySymbol)) {
                throw new BunnyInvalidStateError(`Non-symbol as arg constant: ${sym}`);
            }
            const val = getObject(this.stack, pos + i);
            bindings.push([sym, val]);
        }
        if (fn.isVariadic) {
            const sym = fn.constants[i];
            if (!(sym instanceof BunnySymbol)) {
                throw new BunnyInvalidStateError(`Non-symbol as arg constant: ${sym}`);
            }
            const nRest = nargs - fn.nPositional;
            if (nRest > 0) {
                const restArgs = getObjects(this.stack, pos + i, pos + i + nRest);
                const restList = new BunnyList(restArgs);
                bindings.push([sym, restList]);
            } else {
                bindings.push([sym, NIL]);
            }
        }
        return new Environment(bindings, fn.env);
    }

    private captureEnclosingEnvironment(
        fn: BunnyClosure,
        initialFrame: number,
    ): BunnyClosure {
        const environments = this.getEnclosingEnvironments(initialFrame);

        const linked = this.linkEnvironments(environments);
        return fn.withEnv(linked);
    }

    private linkEnvironments(environments: Environment[]): Environment {
        const result = environments[0];
        if (!result) {
            throw new BunnyInvalidStateError(
                "There should probably be at least one of these",
            );
        }
        let current = result;
        for (let i = 1; i < environments.length; i++) {
            const next = environments[i]!;
            current.setNext(next);
            if (next.hasNext()) {
                break;
            }
            current = next;
        }
        return result;
    }

    private getEnclosingEnvironments(initialFrame: number): Environment[] {
        const result: Environment[] = [];
        let frame = this.currentFrame;
        while (frame > initialFrame) {
            const env = getEnvironment(this.stack, frame - 3);
            result.push(env);
            frame = getNumber(this.stack, frame - 2);
        }
        return result;
    }

    private loadFromReader(reader: Reader): BunnyObject | null {
        let result: BunnyObject | null = null;
        for (;;) {
            const form = reader.read();
            if (form === EOF) {
                break;
            }
            const thunk = this.compileThunk(form);
            result = this.apply(thunk, []);
        }
        return result;
    }

    private load(locals: Environment, symbol: BunnySymbol): BunnyObject {
        const local = locals.get(symbol);
        if (local) {
            return local;
        }
        try {
            return this.globals.getOrFail(symbol);
        } catch (e) {
            throw new BunnyNameError(symbol);
        }
    }

    private store(
        locals: Environment,
        symbol: BunnySymbol,
        value: BunnyObject,
    ): BunnyObject {
        const local = locals.set(symbol, value);
        if (local) {
            return local;
        }
        try {
            return this.globals.setOrFail(symbol, value);
        } catch (e) {
            throw new BunnyNameError(symbol);
        }
    }

    private static intrinsicsEnvironment(): Environment {
        return new Environment(
            Object.entries(intrinsics).map(([name, val]) => [
                symbolTable.intern(name),
                new BunnyIntrinsic(name, val),
            ]),
            null,
        );
    }
}
