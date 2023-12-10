import {
    BunnyBoolean,
    BunnyIntrinsic,
    BunnyList,
    BunnyNumber,
    BunnyObject,
    BunnyString,
    BunnyType,
    FALSE,
    IntrinsicFn,
    IVirtualMachine,
    NIL,
    TRUE,
} from "./data.ts";
import {
    BunnyArgumentError,
    BunnyInvalidStateError,
    BunnyTypeError,
} from "./errors.ts";
import * as symbolTable from "./reader/symbol-table.ts";
import { equal } from "./equal.ts";
import { printLn } from "./printer.ts";

type Intrinsic =
    | "apply"
    | "identical?"
    | "equal?"
    | "type-of"
    | "intern"
    | "gensym"
    | "cons"
    | "list"
    | "list*"
    | "append"
    | "concat"
    | "nth"
    | "rest"
    | "+"
    | "-"
    | "*"
    | "/"
    | "<"
    | ">"
    | "macro!"
    | "print"
    | "load";

function identicalp(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    checkArgs(args, { minArgs: 2, maxArgs: 2 });
    const arg0 = getArg(args, 0);
    const arg1 = getArg(args, 1);
    return bool(arg0 === arg1);
}

function equalp(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    checkArgs(args, { minArgs: 2, maxArgs: 2 });
    const arg0 = getArg(args, 0);
    const arg1 = getArg(args, 1);
    const result = equal(arg0, arg1);
    return bool(result);
}

function typeOf(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    checkArgs(args, { minArgs: 1, maxArgs: 1 });
    const arg = getArg(args, 0);
    return symbolTable.intern(`${arg.type}`);
}

function intern(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    checkArgs(args, { minArgs: 1, maxArgs: 1 });
    const arg = getArg(args, 1);
    if (arg.type !== BunnyType.string) {
        throw new BunnyTypeError(BunnyType.string, arg);
    }
    return symbolTable.intern(arg.value);
}

function gensym(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    checkArgs(args, { minArgs: 0, maxArgs: 1 });
    if (args.length === 0) {
        return symbolTable.gensym();
    }
    const arg = getArg(args, 1);
    if (arg.type !== BunnyType.string) {
        throw new BunnyTypeError(BunnyType.string, arg);
    }
    return symbolTable.gensym(arg.value);
}

function cons(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    checkArgs(args, { minArgs: 2, maxArgs: 2 });
    const fst = getArg(args, 0);
    const rst = getArg(args, 1);
    if (rst.type !== BunnyType.list) {
        throw new BunnyTypeError(BunnyType.list, rst);
    }
    const result = [fst, ...rst.value];
    return new BunnyList(result);
}

function list(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    return new BunnyList(args);
}

function listStar(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    checkArgs(args, { minArgs: 2 });
    const lastArg = getArg(args, args.length - 1);
    if (lastArg.type !== BunnyType.list) {
        throw new BunnyTypeError(BunnyType.list, lastArg);
    }
    let result: BunnyList = lastArg;
    for (let i = args.length - 2; i >= 0; i--) {
        const arg = getArg(args, i);
        result = result.cons(arg);
    }
    return result;
}

function append(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    checkArgs(args, { minArgs: 2, maxArgs: 2 });
    const seq = getArg(args, 0);
    const val = getArg(args, 1);
    if (seq.type === BunnyType.list) {
        return new BunnyList([...seq.value, val]);
    }
    if (seq.type === BunnyType.string) {
        return concatStrings(seq, [val]);
    }
    throw new BunnyTypeError([BunnyType.list, BunnyType.string], seq);
}

function concat(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    checkArgs(args, { minArgs: 1 });
    const arg = getArg(args, 0);
    if (arg.type === BunnyType.list) {
        return concatLists(arg, args.slice(1));
    }
    if (arg.type === BunnyType.string) {
        return concatStrings(arg, args.slice(1));
    }
    throw new BunnyTypeError([BunnyType.list, BunnyType.string], arg);
}

function concatLists(list: BunnyList, more: BunnyObject[]): BunnyList {
    const result = [...list.value];
    for (let i = 0; i < more.length; i++) {
        const obj = getArg(more, 0);
        if (obj.type !== BunnyType.list) {
            throw new BunnyTypeError(BunnyType.list, obj);
        }
        result.push(...obj.value);
    }
    return new BunnyList(result);
}

function concatStrings(str: BunnyString, more: BunnyObject[]): BunnyString {
    let result = str.value;
    for (let i = 0; i < more.length; i++) {
        const obj = getArg(more, i);
        if (obj.type !== BunnyType.string) {
            throw new BunnyTypeError(BunnyType.string, obj);
        }
        result += obj.value;
    }
    return new BunnyString(result);
}

function nth(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    checkArgs(args, { minArgs: 2, maxArgs: 2 });
    const seq = getArg(args, 0);
    const idx = getArg(args, 1);
    if (idx.type !== BunnyType.number) {
        throw new BunnyTypeError(BunnyType.number, idx);
    }
    if (seq.type === BunnyType.list) {
        return seq.nth(idx.value);
    }
    if (seq.type === BunnyType.string) {
        return new BunnyString(seq.value[idx.value]!);
    }
    throw new BunnyTypeError([BunnyType.list, BunnyType.string], seq);
}

function rest(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    checkArgs(args, { minArgs: 1, maxArgs: 1 });
    const arg = getArg(args, 0);
    if (arg.type !== BunnyType.list) {
        throw new BunnyTypeError(BunnyType.list, arg);
    }
    return arg.rest();
}

function add(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    let result = 0;
    for (const arg of args) {
        if (arg.type !== BunnyType.number) {
            throw new BunnyTypeError(BunnyType.number, arg);
        }
        result += arg.value;
    }
    return new BunnyNumber(result);
}

function sub(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    if (args.length === 0) {
        return new BunnyNumber(0);
    }
    const firstArg = getArg(args, 0);
    if (firstArg.type !== BunnyType.number) {
        throw new BunnyTypeError(BunnyType.number, firstArg);
    }
    if (args.length === 1) {
        return new BunnyNumber(-firstArg.value);
    }
    let result = firstArg.value;
    for (let i = 1; i < args.length; i++) {
        const arg = getArg(args, i);
        if (arg.type !== BunnyType.number) {
            throw new BunnyTypeError(BunnyType.number, arg);
        }
        result -= arg.value;
    }
    return new BunnyNumber(result);
}

function mul(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    let result = 1;
    for (const arg of args) {
        if (arg.type !== BunnyType.number) {
            throw new BunnyTypeError(BunnyType.number, arg);
        }
        result *= arg.value;
    }
    return new BunnyNumber(result);
}

function div(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    checkArgs(args, { minArgs: 1 });
    let arg = getArg(args, 0);
    if (arg.type !== BunnyType.number) {
        throw new BunnyTypeError(BunnyType.number, arg);
    }
    let result = arg.value;
    for (let i = 1; i < args.length; i++) {
        arg = getArg(args, i);
        if (!(arg instanceof BunnyNumber)) {
            throw new BunnyTypeError(BunnyType.number, arg);
        }
        result /= arg.value;
    }
    return new BunnyNumber(result);
}

function lt(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    const result = compare("<", args);
    return bool(result);
}

function gt(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    const result = compare(">", args);
    return bool(result);
}

function compare(comp: "<" | ">", args: BunnyObject[]): boolean {
    checkArgs(args, { minArgs: 2, maxArgs: 2 });
    const n = getArg(args, 0);
    if (n.type !== BunnyType.number) {
        throw new BunnyTypeError(BunnyType.number, n);
    }
    const m = getArg(args, 1);
    if (m.type !== BunnyType.number) {
        throw new BunnyTypeError(BunnyType.number, m);
    }
    return comp === "<" ? n.value < m.value : n.value > m.value;
}

function macro(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    checkArgs(args, { minArgs: 1, maxArgs: 1 });
    const arg = getArg(args, 0);
    if (arg.type !== BunnyType.closure) {
        throw new BunnyTypeError(BunnyType.closure, arg);
    }
    arg.isMacro = true;
    return arg;
}

function print(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    checkArgs(args, { minArgs: 1, maxArgs: 1 });
    const arg = getArg(args, 0);
    printLn(arg);
    return NIL;
}

function load(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    checkArgs(args, { minArgs: 1, maxArgs: 1 });
    const arg = getArg(args, 0);
    if (arg.type !== BunnyType.string) {
        throw new BunnyTypeError(BunnyType.string, arg);
    }
    vm.loadFile(arg.value);
    return NIL;
}

function apply(vm: IVirtualMachine, args: BunnyObject[]): BunnyObject {
    checkArgs(args, { minArgs: 2, maxArgs: 2 });
    const fn = getArg(args, 0);
    const xs = getArg(args, 1);
    if (xs.type !== BunnyType.list) {
        throw new BunnyTypeError(BunnyType.list, xs);
    }
    if (fn.type === BunnyType.intrinsic) {
        return fn.value(vm, xs.value);
    }
    if (fn.type === BunnyType.closure) {
        return vm.apply(fn, xs.value);
    }
    throw new BunnyTypeError([BunnyType.intrinsic, BunnyType.closure], fn);
}

const intrinsicApply = new BunnyIntrinsic("apply", apply);

export function isApply(intrinsic: BunnyIntrinsic): boolean {
    return intrinsic === intrinsicApply;
}

function getArg(args: BunnyObject[], n: number): BunnyObject {
    const result = args[n];
    if (!result) {
        throw new BunnyInvalidStateError(`Invalid arg ${n}`);
    }
    return result;
}

function checkArgs(
    args: BunnyObject[],
    spec: { minArgs?: number; maxArgs?: number },
): void {
    const { minArgs, maxArgs } = spec;
    if (typeof minArgs === "number" && args.length < minArgs) {
        throw new BunnyArgumentError("few");
    }
    if (typeof maxArgs === "number" && args.length > maxArgs) {
        throw new BunnyArgumentError("many");
    }
}

function bool(value: boolean): BunnyBoolean {
    return value ? TRUE : FALSE;
}

export const intrinsics: Record<Intrinsic, IntrinsicFn> = {
    apply,
    intern,
    gensym,
    cons,
    list,
    nth,
    rest,
    append,
    concat,
    print,
    load,
    ["list*"]: listStar,
    ["identical?"]: identicalp,
    ["equal?"]: equalp,
    ["type-of"]: typeOf,
    ["+"]: add,
    ["-"]: sub,
    ["*"]: mul,
    ["/"]: div,
    ["<"]: lt,
    [">"]: gt,
    ["macro!"]: macro,
};
