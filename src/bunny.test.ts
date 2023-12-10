import { describe, test, expect, afterEach } from "bun:test";
import { readString } from "./reader/reader.ts";
import { VirtualMachine } from "./virtual-machine/virtual-machine.ts";
import { BunnyList, BunnyNumber } from "./data.ts";

const vm = new VirtualMachine();

describe("bunny", () => {
    afterEach(() => {
        vm.reset();
    });
    test("function returning a constant", () => {
        const form = readString("(fn () 1)");
        const fn = vm.compileFunction(form);
        const result = vm.apply(fn, []);
        expect(result).toStrictEqual(new BunnyNumber(1));
    });
    test("function returning an argument", () => {
        const form = readString("(fn (n) n)");
        const fn = vm.compileFunction(form);
        const result = vm.apply(fn, [new BunnyNumber(1)]);
        expect(result).toStrictEqual(new BunnyNumber(1));
    });
    test("function calling an intrinsic", () => {
        const form = readString("(fn (n) (+ n 1))");
        const fn = vm.compileFunction(form);
        const result = vm.apply(fn, [new BunnyNumber(1)]);
        expect(result).toStrictEqual(new BunnyNumber(2));
    });
    test("function calling a function", () => {
        const form = readString("(fn () ((fn (n) (+ n 1)) 1))");
        const fn = vm.compileFunction(form);
        const result = vm.apply(fn, []);
        expect(result).toStrictEqual(new BunnyNumber(2));
    });
    test("truthy test", () => {
        const form = readString("(fn () (if true 1 2))");
        const fn = vm.compileFunction(form);
        const result = vm.apply(fn, []);
        expect(result).toStrictEqual(new BunnyNumber(1));
    });
    test("falsey test", () => {
        const form = readString("(fn () (if false 1 2))");
        const fn = vm.compileFunction(form);
        const result = vm.apply(fn, []);
        expect(result).toStrictEqual(new BunnyNumber(2));
    });
    test("nested conditional", () => {
        const form = readString("(fn () (if true (if false 3 4) 2))");
        const fn = vm.compileFunction(form);
        const result = vm.apply(fn, []);
        expect(result).toStrictEqual(new BunnyNumber(4));
    });
    test("setting locals", () => {
        const form = readString("(fn (n) (set! n 2) n)");
        const fn = vm.compileFunction(form);
        const result = vm.apply(fn, [new BunnyNumber(1)]);
        expect(result).toStrictEqual(new BunnyNumber(2));
    });
    test("setting globals", () => {
        const form = readString("(fn () (def n 1) (set! n 2) n)");
        const fn = vm.compileFunction(form);
        const result = vm.apply(fn, []);
        expect(result).toStrictEqual(new BunnyNumber(2));
    });
    test("simple closure", () => {
        const form = readString("(fn (n) ((fn () (+ n 1))))");
        const fn = vm.compileFunction(form);
        const result = vm.apply(fn, [new BunnyNumber(1)]);
        expect(result).toStrictEqual(new BunnyNumber(2));
    });
    test("variadic function positional", () => {
        const form = readString("(fn (n & rest) n)");
        const fn = vm.compileFunction(form);
        const result = vm.apply(fn, [new BunnyNumber(1)]);
        expect(result).toStrictEqual(new BunnyNumber(1));
    });
    test("variadic function rest", () => {
        const form = readString("(fn (n & rest) rest)");
        const fn = vm.compileFunction(form);
        const result = vm.apply(fn, [
            new BunnyNumber(1),
            new BunnyNumber(2),
            new BunnyNumber(3),
        ]);
        expect(result).toStrictEqual(
            new BunnyList([new BunnyNumber(2), new BunnyNumber(3)]),
        );
    });
    test("throws if too many args and not variadic", () => {
        const form = readString("(fn (n) n)");
        const fn = vm.compileFunction(form);
        const testFn = () => vm.apply(fn, [new BunnyNumber(1), new BunnyNumber(2)]);
        expect(testFn).toThrow();
    });
    test("throws if too few args", () => {
        const form = readString("(fn (n) n)");
        const fn = vm.compileFunction(form);
        const testFn = () => vm.apply(fn, []);
        expect(testFn).toThrow();
    });
});
