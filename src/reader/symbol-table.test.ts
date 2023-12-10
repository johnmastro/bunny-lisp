import * as symbolTable from "./symbol-table.ts";
import { describe, test, expect } from "bun:test";

describe("symbol table", () => {
    describe("intern", () => {
        test("returns identical symbols", () => {
            const a1 = symbolTable.intern("a");
            const a2 = symbolTable.intern("a");
            expect(a1 === a2).toBeTrue();
        });
    });
    describe("gensym", () => {
        test("returns distinct symbols", () => {
            const a1 = symbolTable.gensym("a");
            const a2 = symbolTable.gensym("a");
            expect(a1 === a2).not.toBeTrue();
        });
    });
});
