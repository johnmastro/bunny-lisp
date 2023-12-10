import { describe, test, expect } from "bun:test";
import { StringStream } from "./string-stream.ts";

describe("StringStream", () => {
    test("peek", () => {
        const stream = new StringStream("ab");
        expect(stream.peek()).toBe("a");
        expect(stream.peek()).toBe("a");
    });
    test("read", () => {
        const stream = new StringStream("ab");
        expect(stream.read()).toBe("a");
        expect(stream.read()).toBe("b");
        const testEof = () => stream.read();
        expect(testEof).toThrow(/EOF/);
    });
    test("unread", () => {
        const stream = new StringStream("ab");
        expect(stream.read()).toBe("a");
        const testFn1 = () => stream.unread("a");
        expect(testFn1).not.toThrow();
        expect(testFn1).toThrow(/Can't unread what you haven't read/);
        expect(stream.read()).toBe("a");
        expect(stream.read()).toBe("b");
        const testFn2 = () => stream.unread("x");
        expect(testFn2).toThrow(/That's not what we read/);
    });
});
