import {
    BunnyBoolean,
    BunnyClosure,
    BunnyIntrinsic,
    BunnyList,
    BunnyNumber,
    BunnyObject,
    BunnyString,
    BunnySymbol,
    BunnyType,
} from "./data.ts";

export function printLn(obj: BunnyObject): void {
    const s = stringify(obj);
    process.stdout.write(`${s}\n`);
}

export function stringify(obj: BunnyObject): string {
    switch (obj.type) {
        case BunnyType.list:
            return stringifyList(obj);
        case BunnyType.string:
            return stringifyString(obj);
        case BunnyType.symbol:
            return stringifySymbol(obj);
        case BunnyType.number:
            return stringifyNumber(obj);
        case BunnyType.boolean:
            return stringifyBoolean(obj);
        case BunnyType.intrinsic:
            return stringifyIntrinsic(obj);
        case BunnyType.closure:
            return stringifyClosure(obj);
    }
}

function stringifyList(obj: BunnyList): string {
    return `(${obj.value.map((o) => stringify(o)).join(" ")})`;
}

function stringifyString(obj: BunnyString): string {
    return `"${obj.value}"`;
}

function stringifySymbol(obj: BunnySymbol): string {
    return obj.name;
}

function stringifyNumber(obj: BunnyNumber): string {
    return String(obj.value);
}

function stringifyBoolean(obj: BunnyBoolean): string {
    return String(obj.value);
}

function stringifyIntrinsic(obj: BunnyIntrinsic): string {
    return `#<intrinsic ${obj.name}>`;
}

function stringifyClosure(obj: BunnyClosure): string {
    return `#<closure ${obj.name}>`;
}
