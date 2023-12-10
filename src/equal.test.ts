import { describe, test, expect } from "bun:test";
import { equal } from "./equal.ts";
import * as symbolTable from "./reader/symbol-table.ts";
import { BunnyList, BunnyString, BunnySymbol } from "./data.ts";

describe("equal", () => {
    describe("symbol", () => {
        test("only equal if they're identical", () => {
            const identicalResult = equal(
                symbolTable.intern("foo"),
                symbolTable.intern("foo"),
            );
            expect(identicalResult).toBeTrue();
            const distinctResult = equal(
                new BunnySymbol("foo"),
                new BunnySymbol("foo"),
            );
            expect(distinctResult).toBeFalse();
        });
    });
    describe("list", () => {
        test("works", () => {
            const a0 = new BunnyList([new BunnyString("foo"), new BunnyString("bar")]);
            const a1 = new BunnyList([new BunnyString("foo"), new BunnyString("bar")]);
            const b0 = new BunnyList([new BunnyString("foo"), new BunnyString("wut")]);
            const equalResult = equal(a0, a1);
            expect(equalResult).toBeTrue();
            const nonEqualResult = equal(a0, b0);
            expect(nonEqualResult).toBeFalse();
        });
    });
});
