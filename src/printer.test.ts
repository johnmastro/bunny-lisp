import { describe, test, expect } from "bun:test";
import {
    BunnyList,
    BunnyNumber,
    BunnyString,
    BunnySymbol,
    FALSE,
    NIL,
    TRUE,
} from "./data.ts";
import { stringify } from "./printer.ts";

describe("printer", () => {
    describe("repr", () => {
        describe("list", () => {
            test("empty", () => {
                const result = stringify(NIL);
                expect(result).toBe("()");
            });
            test("non-empty", () => {
                const result = stringify(
                    new BunnyList([
                        new BunnySymbol("foo"),
                        new BunnyNumber(1),
                        TRUE,
                        new BunnyString("bar"),
                        new BunnyList([NIL, new BunnyString("")]),
                    ]),
                );
                expect(result).toBe('(foo 1 true "bar" (() ""))');
            });
        });
        describe("string", () => {
            test("empty", () => {
                const result = stringify(new BunnyString(""));
                expect(result).toBe('""');
            });
            test("non-empty", () => {
                const result = stringify(new BunnyString("foo"));
                expect(result).toBe('"foo"');
            });
        });
        describe("symbol", () => {
            test("simple", () => {
                const result = stringify(new BunnySymbol("foo"));
                expect(result).toBe("foo");
            });
            test("symbolic", () => {
                const result = stringify(new BunnySymbol("->>"));
                expect(result).toBe("->>");
            });
        });
        describe("number", () => {
            test("positive integer", () => {
                const result = stringify(new BunnyNumber(1));
                expect(result).toBe("1");
            });
            test("negative integer", () => {
                const result = stringify(new BunnyNumber(-1));
                expect(result).toBe("-1");
            });
            test("positive float", () => {
                const result = stringify(new BunnyNumber(1.2));
                expect(result).toBe("1.2");
            });
            test("negative float", () => {
                const result = stringify(new BunnyNumber(-1.2));
                expect(result).toBe("-1.2");
            });
        });
        describe("boolean", () => {
            test("true", () => {
                const result = stringify(TRUE);
                expect(result).toBe("true");
            });
            test("true", () => {
                const result = stringify(FALSE);
                expect(result).toBe("false");
            });
        });
    });
});
