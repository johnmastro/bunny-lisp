import { BunnyObject, BunnySymbol, BunnyType } from "./data.ts";

export class BunnyEofError extends Error {
    constructor(context?: "list" | "string") {
        let message = "EOF reading";
        if (context) {
            message += ` ${context}`;
        }
        super(message);
        this.name = "BunnyEofError";
    }
}

export class BunnySyntaxError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "BunnySyntaxError";
    }
}

export class BunnyNameError extends Error {
    constructor(value: BunnySymbol | string) {
        const name = typeof value === "string" ? value : value.name;
        super(`Name not found in environment: ${name}`);
        this.name = "BunnyNameError";
    }
}

export class BunnyArgumentError extends Error {
    constructor(kind: "many" | "few") {
        super(`Too ${kind} arguments`);
        this.name = "BunnyArgumentError";
    }
}

export class BunnyTypeError extends Error {
    constructor(expected: BunnyType | BunnyType[], got: BunnyObject) {
        const expectedArray = Array.isArray(expected) ? expected : [expected];
        const expectedString = expectedArray.join(" or ");
        super(`Expected ${expectedString}, got ${got.type} (${got}`);
        this.name = "BunnyTypeError";
    }
}

export class BunnyValueError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "BunnyValueError";
    }
}

export class BunnyIndexError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "BunnyIndexError";
    }
}

export class BunnyInvalidStateError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "BunnyInvalidStateError";
    }
}

export function assertUnreachable(x: never): never {
    void x;
    throw new BunnyInvalidStateError("Unreachable");
}
