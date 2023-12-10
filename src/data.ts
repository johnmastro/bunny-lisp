export enum BunnyType {
    number = "number",
    symbol = "symbol",
    boolean = "boolean",
    string = "string",
    list = "list",
    intrinsic = "intrinsic",
    closure = "closure",
}

export interface IBunnyObject<T extends BunnyType> {
    readonly type: T;
}

export class BunnyNumber implements IBunnyObject<BunnyType.number> {
    readonly type = BunnyType.number;
    constructor(readonly value: number) {}
}

export class BunnySymbol implements IBunnyObject<BunnyType.symbol> {
    readonly type = BunnyType.symbol;
    constructor(readonly name: string) {}
}

export class BunnyBoolean implements IBunnyObject<BunnyType.boolean> {
    readonly type = BunnyType.boolean;
    constructor(readonly value: boolean) {}
}

export class BunnyString implements IBunnyObject<BunnyType.string> {
    readonly type = BunnyType.string;
    constructor(readonly value: string) {}
}

export class BunnyList implements IBunnyObject<BunnyType.list> {
    readonly type = BunnyType.list;
    constructor(readonly value: BunnyObject[]) {}
}

export type IntrinsicFn = (vm: IVirtualMachine, args: BunnyObject[]) => BunnyObject;

export class BunnyIntrinsic implements IBunnyObject<BunnyType.intrinsic> {
    readonly type = BunnyType.intrinsic;
    constructor(
        readonly name: string,
        readonly value: IntrinsicFn,
    ) {}
}

export class BunnyClosure implements IBunnyObject<BunnyType.closure> {
    readonly type = BunnyType.closure;
    isMacro: boolean = false;

    constructor(
        readonly name: string,
        readonly code: Uint16Array,
        readonly nPositional: number,
        readonly isVariadic: boolean,
        readonly constants: BunnyObject[],
        readonly env: Environment | null = null,
    ) {}

    withEnv(env: Environment): BunnyClosure {
        const result = new BunnyClosure(
            this.name,
            this.code,
            this.nPositional,
            this.isVariadic,
            this.constants,
            env,
        );
        result.isMacro = this.isMacro;
        return result;
    }
}

export type BunnyObject =
    | BunnyNumber
    | BunnySymbol
    | BunnyBoolean
    | BunnyString
    | BunnyList
    | BunnyIntrinsic
    | BunnyClosure;

export type BunnyFunction = BunnyIntrinsic | BunnyClosure;

export const TRUE = new BunnyBoolean(true);

export const FALSE = new BunnyBoolean(false);

export const NIL = new BunnyList([]);

export class Environment {
    private readonly bindings: Map<BunnySymbol, BunnyObject>;
    private next: Environment | null;

    constructor(
        bindings: Iterable<readonly [BunnySymbol, BunnyObject]>,
        next: Environment | null,
    ) {
        this.bindings = new Map(bindings);
        this.next = next;
    }

    def(symbol: BunnySymbol, value: BunnyObject): BunnyObject {
        this.bindings.set(symbol, value);
        return value;
    }

    set(symbol: BunnySymbol, value: BunnyObject): BunnyObject | null {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let env: Environment | null = this;
        while (env) {
            const here = env.bindings.has(symbol);
            if (here) {
                env.bindings.set(symbol, value);
                return value;
            }
            env = env.next;
        }
        return null;
    }

    setOrFail(symbol: BunnySymbol, value: BunnyObject): BunnyObject {
        const result = this.set(symbol, value);
        if (!result) {
            throw new Error(`Name not found: ${symbol.name}`);
        }
        return result;
    }

    get(symbol: BunnySymbol): BunnyObject | null {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let env: Environment | null = this;
        while (env) {
            const value = env.bindings.get(symbol);
            if (value) {
                return value;
            }
            env = env.next;
        }
        return null;
    }

    getOrFail(symbol: BunnySymbol): BunnyObject {
        const result = this.get(symbol);
        if (!result) {
            throw new Error(`Name not found: ${symbol.name}`);
        }
        return result;
    }

    hasNext(): boolean {
        return !!this.next;
    }

    setNext(env: Environment): void {
        this.next = env;
    }
}

export interface IVirtualMachine {
    apply(fn: BunnyClosure, args: BunnyObject[]): BunnyObject;
    compileFunction(form: BunnyObject): BunnyClosure;
    compileThunk(form: BunnyObject): BunnyClosure;
    macroexpand(form: BunnyObject): BunnyObject;
    loadFile(file: string): BunnyObject | null;
    loadString(str: string): BunnyObject | null;
    lookupGlobal(symbol: BunnySymbol): BunnyObject | null;
    reset(): void;
}
