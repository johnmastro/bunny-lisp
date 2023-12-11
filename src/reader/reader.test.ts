import { describe, test, expect } from "bun:test";
import { readString, Reader, EOF } from "./reader.ts";
import {
    BunnyList,
    BunnyNumber,
    BunnyString,
    BunnySymbol,
    FALSE,
    NIL,
    TRUE,
} from "../data.ts";

describe("Reader", () => {
    describe("boolean", () => {
        test("true", () => {
            const result = readString("true");
            expect(result).toBe(TRUE);
        });
        test("false", () => {
            const result = readString("false");
            expect(result).toBe(FALSE);
        });
    });
    describe("number", () => {
        test("positive integer", () => {
            const result = readString("1");
            expect(result).toStrictEqual(new BunnyNumber(1));
        });
        test("negative integer", () => {
            const result = readString("-1");
            expect(result).toStrictEqual(new BunnyNumber(-1));
        });
        test("positive float", () => {
            const result = readString("1.2");
            expect(result).toStrictEqual(new BunnyNumber(1.2));
        });
        test("negative float", () => {
            const result = readString("-1.2");
            expect(result).toStrictEqual(new BunnyNumber(-1.2));
        });
    });
    describe("symbol", () => {
        test("simple", () => {
            const result = readString("foo");
            expect(result).toStrictEqual(new BunnySymbol("foo"));
        });
        test("symbolic", () => {
            const result = readString("->>");
            expect(result).toStrictEqual(new BunnySymbol("->>"));
        });
    });
    describe("string", () => {
        test("empty", () => {
            const result = readString('""');
            expect(result).toStrictEqual(new BunnyString(""));
        });
        test("non-empty", () => {
            const result = readString('"foo"');
            expect(result).toStrictEqual(new BunnyString("foo"));
        });
    });
    describe("list", () => {
        test("nil", () => {
            const result = readString("nil");
            expect(result).toBe(NIL);
        });
        test("empty", () => {
            const result = readString("()");
            expect(result).toBe(NIL);
        });
        test("non-empty", () => {
            const result = readString('(foo 1 true "bar")');
            expect(result).toStrictEqual(
                new BunnyList([
                    new BunnySymbol("foo"),
                    new BunnyNumber(1),
                    TRUE,
                    new BunnyString("bar"),
                ]),
            );
        });
    });
    describe("whitespace", () => {
        test("spaces", () => {
            const result = readString("    foo");
            expect(result).toStrictEqual(new BunnySymbol("foo"));
        });
        test("newlines", () => {
            const result = readString("\n\nfoo");
            expect(result).toStrictEqual(new BunnySymbol("foo"));
        });
        test("tabs", () => {
            const result = readString("\t\tfoo");
            expect(result).toStrictEqual(new BunnySymbol("foo"));
        });
        test("comments", () => {
            const result = readString(";; An important comment\nfoo");
            expect(result).toStrictEqual(new BunnySymbol("foo"));
        });
    });
    describe("sequential reads", () => {
        test("works", () => {
            const reader = Reader.fromString("foo bar baz");
            expect(reader.read()).toStrictEqual(new BunnySymbol("foo"));
            expect(reader.read()).toStrictEqual(new BunnySymbol("bar"));
            expect(reader.read()).toStrictEqual(new BunnySymbol("baz"));
            expect(reader.read()).toStrictEqual(EOF);
        });
    });
    describe("whitespace before closing paren", () => {
        test("works", () => {
            const result = readString("(foo bar  )");
            expect(result).toStrictEqual(
                new BunnyList([new BunnySymbol("foo"), new BunnySymbol("bar")]),
            );
        });
    });
    describe("quote", () => {
        test("on an atom", () => {
            const result = readString("'foo");
            expect(result).toStrictEqual(
                new BunnyList([new BunnySymbol("quote"), new BunnySymbol("foo")]),
            );
        });
        test("on a list", () => {
            const result = readString("'(foo bar)");
            expect(result).toStrictEqual(
                new BunnyList([
                    new BunnySymbol("quote"),
                    new BunnyList([new BunnySymbol("foo"), new BunnySymbol("bar")]),
                ]),
            );
        });
    });
    describe("quasiquote", () => {
        const result = readString("`(~foo ~@bar)");
        expect(result).toStrictEqual(
            new BunnyList([
                new BunnySymbol("quasiquote"),
                new BunnyList([
                    new BunnyList([new BunnySymbol("unquote"), new BunnySymbol("foo")]),
                    new BunnyList([
                        new BunnySymbol("unquote-splicing"),
                        new BunnySymbol("bar"),
                    ]),
                ]),
            ]),
        );
    });
});
