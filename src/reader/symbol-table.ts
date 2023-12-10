import { BunnySymbol } from "../data.ts";
import { randomBytes } from "crypto";

const symbols = new Map<string, BunnySymbol>();

export function intern(name: string): BunnySymbol {
    let symbol = symbols.get(name);
    if (symbol) {
        return symbol;
    }
    symbol = new BunnySymbol(name);
    symbols.set(name, symbol);
    return symbol;
}

export function gensym(name?: string): BunnySymbol {
    const gensymName = `${name || "gensym"}-${randomBytes(2).toString("hex")}`;
    return new BunnySymbol(gensymName);
}
