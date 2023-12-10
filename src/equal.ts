import { BunnyList, BunnyObject, BunnyType } from "./data.ts";

export function equal(a: BunnyObject, b: BunnyObject): boolean {
    if (a === b) {
        return true;
    }
    if (a.type !== b.type) {
        return false;
    }
    switch (a.type) {
        case BunnyType.symbol:
        case BunnyType.intrinsic:
        case BunnyType.closure:
            // These are only equal if the bunny objects themselves are identical
            // (Object.is equality), which we already checked
            return false;
        case BunnyType.number:
        case BunnyType.boolean:
        case BunnyType.string:
            // We already checked that a and b have the same type, so the cast is safe
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return a.value === (b as any).value;
        case BunnyType.list:
            // Same here
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return listEqual(a, b as any);
    }
}

function listEqual(xs: BunnyList, ys: BunnyList): boolean {
    if (xs.value.length !== ys.value.length) {
        return false;
    }
    for (let i = 0; i < xs.value.length; i++) {
        const x = xs.value[i]!;
        const y = ys.value[i]!;
        if (!equal(x, y)) {
            return false;
        }
    }
    return true;
}
