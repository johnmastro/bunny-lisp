import {
    BunnyClosure,
    BunnyList,
    BunnyObject,
    BunnySymbol,
    BunnyType,
    IVirtualMachine,
    NIL,
} from "../data.ts";
import { BunnySyntaxError, BunnyTypeError } from "../errors";
import { BytecodeWriter } from "./bytecode-writer.ts";
import * as symbolTable from "../reader/symbol-table.ts";
import {
    InstructionCall,
    InstructionClosure,
    InstructionConst,
    InstructionDef,
    InstructionJump,
    InstructionJumpIfNot,
    InstructionLabel,
    InstructionLoad,
    InstructionPop,
    InstructionRet,
    InstructionStore,
} from "./instructions.ts";

const FN = symbolTable.intern("fn");
const IF = symbolTable.intern("if");
const DEF = symbolTable.intern("def");
const SET = symbolTable.intern("set!");
const QUOTE = symbolTable.intern("quote");

const specialForms = [FN, IF, DEF, SET, QUOTE];

const AMP = symbolTable.intern("&");

export function compileFunction(vm: IVirtualMachine, form: BunnyObject): BunnyClosure {
    const compiler = new FunctionCompiler(vm);
    return compiler.compile(form);
}

export function compileThunk(vm: IVirtualMachine, form: BunnyObject): BunnyClosure {
    const functionForm = new BunnyList([FN, NIL, form]);
    return compileFunction(vm, functionForm);
}

export function macroexpand(vm: IVirtualMachine, form: BunnyObject): BunnyObject {
    const compiler = new FunctionCompiler(vm);
    return compiler.macroexpand(form);
}

export function macroexpandOnce(vm: IVirtualMachine, form: BunnyObject): BunnyObject {
    const compiler = new FunctionCompiler(vm);
    return compiler.macroexpandOnce(form);
}

interface ParsedArgList {
    readonly nPositional: number;
    readonly isVariadic: boolean;
    readonly symbols: BunnySymbol[];
}

interface ParsedFunction {
    readonly symbol: BunnySymbol | null;
    readonly args: ParsedArgList;
    readonly body: BunnyList;
}

class FunctionCompiler {
    private readonly wtr = new BytecodeWriter();
    private constants: BunnyObject[] = [];
    private labelCounter = 0;

    constructor(private readonly vm: IVirtualMachine) {}

    compile(form: BunnyObject): BunnyClosure {
        const parsed = parse(form);
        this.constants.push(...parsed.args.symbols);
        this.compileBody(parsed.body);
        this.wtr.write(new InstructionRet());
        return new BunnyClosure(
            parsed.symbol?.name ?? "anonymous",
            this.wtr.bytecode(),
            parsed.args.nPositional,
            parsed.args.isVariadic,
            this.constants,
        );
    }

    macroexpand(form: BunnyObject): BunnyObject {
        for (;;) {
            const result = this.macroexpandOnce(form);
            if (form === result) {
                return result;
            }
            form = result;
        }
    }

    macroexpandOnce(form: BunnyObject): BunnyObject {
        if (isNonNilList(form)) {
            const head = form.first();
            if (head.type === BunnyType.symbol && !isSpecial(head)) {
                const val = this.vm.lookupGlobal(head);
                if (!!val && val.type === BunnyType.closure && val.isMacro) {
                    const args = form.rest();
                    return this.vm.apply(val, args.value);
                }
            }
        }
        return form;
    }

    private compileBody(body: BunnyList): void {
        if (body === NIL) {
            this.compileConst(NIL);
            return;
        }
        for (;;) {
            this.compileForm(body.first());
            if (body.rest() === NIL) {
                return;
            } else {
                this.compileForm(body.first());
                this.wtr.write(new InstructionPop());
                body = body.rest();
            }
        }
    }

    private compileForm(form: BunnyObject): void {
        form = this.macroexpand(form);
        if (isNonNilList(form)) {
            this.compileList(form);
            return;
        }
        if (form.type === BunnyType.symbol) {
            this.compileSymbol(form);
            return;
        }
        this.compileConst(form);
    }

    private compileList(list: BunnyList): void {
        const head = list.first();
        switch (head) {
            case FN: {
                const fn = compileFunction(this.vm, list);
                this.compileConst(fn);
                this.wtr.write(new InstructionClosure());
                return;
            }
            case QUOTE:
                this.compileConst(list.nth(1));
                return;
            case IF:
                this.compileIf(list);
                return;
            case DEF:
                this.compileDef(list);
                return;
            case SET:
                this.compileSet(list);
                return;
            default:
                this.compileCall(list);
        }
    }

    private compileCall(list: BunnyList): void {
        const count = list.count();

        for (let i = 0; i < count; i++) {
            const form = list.nth(i);
            this.compileForm(form);
        }

        this.wtr.write(new InstructionCall(count - 1));
    }

    private compileIf(form: BunnyList): void {
        const testForm = form.nth(1);
        const thenForm = form.nth(2);
        const elseForm = form.nth(3);

        const elseLabel = this.label();
        const endLabel = this.label();

        this.compileForm(testForm);
        this.wtr.write(new InstructionJumpIfNot(elseLabel.id));

        this.compileForm(thenForm);
        this.wtr.write(new InstructionJump(endLabel.id));

        this.wtr.write(elseLabel);
        this.compileForm(elseForm);

        this.wtr.write(endLabel);
    }

    private compileDef(form: BunnyList): void {
        this.compileAssignment(form, InstructionDef);
    }

    private compileSet(form: BunnyList): void {
        this.compileAssignment(form, InstructionStore);
    }

    private compileAssignment(
        form: BunnyList,
        Instruction: typeof InstructionDef | typeof InstructionStore,
    ): void {
        const sym = form.nth(1);
        const valForm = form.nth(2);

        if (sym.type !== BunnyType.symbol) {
            throw new BunnyTypeError(BunnyType.symbol, sym);
        }

        this.compileConst(sym);
        this.compileForm(valForm);
        this.wtr.write(new Instruction());
    }

    private compileSymbol(symbol: BunnySymbol): void {
        this.compileConst(symbol);
        this.wtr.write(new InstructionLoad());
    }

    private compileConst(val: BunnyObject): void {
        const index = this.constIndex(val);
        this.wtr.write(new InstructionConst(index));
    }

    private constIndex(val: BunnyObject): number {
        for (let i = 0; i < this.constants.length; i++) {
            if (this.constants[i] === val) {
                return i;
            }
        }
        this.constants.push(val);
        return this.constants.length - 1;
    }

    private label(): InstructionLabel {
        return new InstructionLabel(this.labelCounter++);
    }
}

function parse(form: BunnyObject): ParsedFunction {
    if (form.type !== BunnyType.list) {
        throw new BunnyTypeError(BunnyType.list, form);
    }
    if (!isFn(form)) {
        throw new BunnySyntaxError(`Expected symbol fn, found ${form.value[0]}`);
    }
    return isNamed(form) ? parseNamed(form) : parseAnonymous(form);
}

function parseNamed(form: BunnyList): ParsedFunction {
    const symbol = form.nth(1);
    const args = form.nth(2);
    if (symbol.type !== BunnyType.symbol) {
        throw new Error(`Expected symbol name, found ${symbol}`);
    }
    if (args.type !== BunnyType.list) {
        throw new Error(`Expected args list, found ${args}`);
    }
    return {
        symbol,
        args: parseArgList(args),
        body: form.drop(3), // `fn`, symbol, args
    };
}

function parseAnonymous(form: BunnyList): ParsedFunction {
    const symbol = null;
    const args = form.nth(1);
    if (args.type !== BunnyType.list) {
        throw new Error(`Expected args list, found ${args}`);
    }
    return {
        symbol,
        args: parseArgList(args),
        body: form.drop(2), // `fn` and args
    };
}

function parseArgList(args: BunnyList): ParsedArgList {
    let nPositional = 0;
    let isVariadic = false;
    const symbols: BunnySymbol[] = [];

    while (args !== NIL) {
        const arg = args.first();
        if (arg.type !== BunnyType.symbol) {
            throw new BunnyTypeError(BunnyType.symbol, arg);
        }
        if (arg === AMP) {
            args = args.rest();
            const restArg = args.first();
            if (restArg.type !== BunnyType.symbol) {
                throw new BunnyTypeError(BunnyType.symbol, restArg);
            }
            if (args.rest() !== NIL) {
                throw new BunnySyntaxError("Should only be one rest arg");
            }
            isVariadic = true;
            symbols.push(restArg);
            break;
        }
        nPositional += 1;
        symbols.push(arg);
        args = args.rest();
    }

    return { nPositional, isVariadic, symbols };
}

function isNonNilList(form: BunnyObject): form is BunnyList {
    return form.type === BunnyType.list && form !== NIL;
}

function isFn(form: BunnyList): boolean {
    return form.value[0] === FN;
}

function isNamed(form: BunnyList): boolean {
    const maybeName = form.value[1];
    return !!maybeName && maybeName.type === BunnyType.symbol;
}

function isSpecial(symbol: BunnySymbol): boolean {
    return specialForms.includes(symbol);
}
