import { describe, test, expect } from "bun:test";
import { BunnyString, BunnySymbol, Environment } from "./data.ts";

describe("data", () => {
    describe("Environment", () => {
        test("binding in the immediate environment", () => {
            const sym = new BunnySymbol("foo");
            const val = new BunnyString("awesome");
            const env = new Environment([[sym, val]], null);
            expect(env.get(sym)).toStrictEqual(val);
            const newVal = new BunnySymbol("better yet");
            env.set(sym, newVal);
            expect(env.get(sym)).toStrictEqual(newVal);
            const softFail = env.get(new BunnySymbol("bad"));
            expect(softFail).toBeNull();
            const hardFail = () => env.getOrFail(new BunnySymbol("bad"));
            expect(hardFail).toThrow();
        });
        test("binding in an enclosing environment", () => {
            const sym = new BunnySymbol("foo");
            const val = new BunnyString("awesome");
            const outerEnv = new Environment([[sym, val]], null);
            const innerEnv = new Environment([], outerEnv);
            expect(innerEnv.get(sym)).toStrictEqual(val);
            const newVal = new BunnySymbol("better yet");
            innerEnv.set(sym, newVal);
            expect(innerEnv.get(sym)).toStrictEqual(newVal);
            const softFail = innerEnv.get(new BunnySymbol("bad"));
            expect(softFail).toBeNull();
            const hardFail = () => innerEnv.getOrFail(new BunnySymbol("bad"));
            expect(hardFail).toThrow();
        });
    });
});
