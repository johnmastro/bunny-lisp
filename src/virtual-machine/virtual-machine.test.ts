import { describe, test, expect, afterEach } from "bun:test";
import { VirtualMachine } from "./virtual-machine.ts";
import { BunnyClosure, BunnyNumber, BunnyString, FALSE, TRUE } from "../data.ts";
import * as bytecodeWriter from "../compiler/bytecode-writer.ts";
import {
    InstructionCall,
    InstructionConst,
    InstructionDef,
    InstructionLoad,
    InstructionPop,
    InstructionRet,
} from "../compiler/instructions.ts";
import * as symbolTable from "../reader/symbol-table.ts";

const vm = new VirtualMachine();

const addSym = symbolTable.intern("+");
const mulSym = symbolTable.intern("*");
const one = new BunnyNumber(1);
const two = new BunnyNumber(2);
const six = new BunnyNumber(6);

describe("VirtualMachine", () => {
    afterEach(() => {
        vm.reset();
    });
    describe("consts", () => {
        test("one const", () => {
            const code = bytecodeWriter.write([
                new InstructionConst(0),
                new InstructionRet(),
            ]);
            const fn = new BunnyClosure("test", code, 0, false, [TRUE], null);
            const result = vm.apply(fn, []);
            expect(result).toStrictEqual(TRUE);
        });
        test("two consts", () => {
            const code = bytecodeWriter.write([
                new InstructionConst(0),
                new InstructionConst(1),
                new InstructionRet(),
            ]);
            const fn = new BunnyClosure("test", code, 0, false, [TRUE, FALSE], null);
            const result = vm.apply(fn, []);
            expect(result).toStrictEqual(FALSE);
        });
        test("two consts and a pop", () => {
            const code = bytecodeWriter.write([
                new InstructionConst(0),
                new InstructionConst(1),
                new InstructionPop(),
                new InstructionRet(),
            ]);
            const fn = new BunnyClosure("test", code, 0, false, [TRUE, FALSE], null);
            const result = vm.apply(fn, []);
            expect(result).toStrictEqual(TRUE);
        });
    });
    describe("globals", () => {
        test("set and load a global", () => {
            const sym = symbolTable.intern("foo");
            const val = new BunnyString("bar");
            const code = bytecodeWriter.write([
                new InstructionConst(0),
                new InstructionConst(1),
                new InstructionDef(),
                new InstructionConst(0),
                new InstructionLoad(),
                new InstructionRet(),
            ]);
            const fn = new BunnyClosure("test", code, 0, false, [sym, val], null);
            const result = vm.apply(fn, []);
            expect(result).toStrictEqual(val);
        });
    });
    describe("intrinsics", () => {
        test("call an intrinsic", () => {
            const code = bytecodeWriter.write([
                new InstructionConst(0),
                new InstructionLoad(),
                new InstructionConst(1),
                new InstructionConst(2),
                new InstructionCall(2),
                new InstructionRet(),
            ]);
            const fn = new BunnyClosure(
                "test",
                code,
                0,
                false,
                [addSym, one, two],
                null,
            );
            const result = vm.apply(fn, []);
            expect(result).toStrictEqual(new BunnyNumber(3));
        });
        test("call TWO intrinsics", () => {
            const code = bytecodeWriter.write([
                new InstructionConst(0),
                new InstructionLoad(),
                new InstructionConst(1),
                new InstructionLoad(),
                new InstructionConst(2),
                new InstructionConst(3),
                new InstructionCall(2),
                new InstructionConst(4),
                new InstructionCall(2),
                new InstructionRet(),
            ]);
            const fn = new BunnyClosure(
                "test",
                code,
                0,
                false,
                [mulSym, addSym, one, two, six],
                null,
            );
            const result = vm.apply(fn, []);
            expect(result).toStrictEqual(new BunnyNumber(18));
        });
    });
    test("call the initial closure with an argument", () => {
        const nSym = symbolTable.intern("n");
        const code = bytecodeWriter.write([
            new InstructionConst(1),
            new InstructionLoad(),
            new InstructionConst(0),
            new InstructionLoad(),
            new InstructionConst(2),
            new InstructionCall(2),
            new InstructionRet(),
        ]);
        const fn = new BunnyClosure("test", code, 1, false, [nSym, addSym, one]);
        const result = vm.apply(fn, [two]);
        expect(result).toStrictEqual(new BunnyNumber(3));
    });
    test("call the initial closure with TWO argument", () => {
        const nSym = symbolTable.intern("n");
        const mSym = symbolTable.intern("m");
        const code = bytecodeWriter.write([
            new InstructionConst(2),
            new InstructionLoad(),
            new InstructionConst(0),
            new InstructionLoad(),
            new InstructionConst(1),
            new InstructionLoad(),
            new InstructionConst(3),
            new InstructionCall(3),
            new InstructionRet(),
        ]);
        const fn = new BunnyClosure("test", code, 2, false, [nSym, mSym, addSym, one]);
        const result = vm.apply(fn, [two, six]);
        expect(result).toStrictEqual(new BunnyNumber(9));
    });
    test("closure calling closures", () => {
        const nSym = symbolTable.intern("n");
        const add1Sym = symbolTable.intern("add1");
        const mul2Sym = symbolTable.intern("mul2");
        const add1Code = bytecodeWriter.write([
            new InstructionConst(1),
            new InstructionLoad(),
            new InstructionConst(0),
            new InstructionLoad(),
            new InstructionConst(2),
            new InstructionCall(2),
            new InstructionRet(),
        ]);
        const add1Fn = new BunnyClosure("add1", add1Code, 1, false, [
            nSym,
            addSym,
            one,
        ]);
        const mul2Code = bytecodeWriter.write([
            new InstructionConst(1),
            new InstructionLoad(),
            new InstructionConst(0),
            new InstructionLoad(),
            new InstructionConst(2),
            new InstructionCall(2),
            new InstructionRet(),
        ]);
        const mul2Fn = new BunnyClosure("mul2", mul2Code, 1, false, [
            nSym,
            mulSym,
            two,
        ]);
        vm.storeGlobals([
            [add1Sym, add1Fn],
            [mul2Sym, mul2Fn],
        ]);
        const code = bytecodeWriter.write([
            new InstructionConst(2),
            new InstructionLoad(),
            new InstructionConst(1),
            new InstructionLoad(),
            new InstructionConst(0),
            new InstructionLoad(),
            new InstructionCall(1),
            new InstructionCall(1),
            new InstructionRet(),
        ]);
        const fn = new BunnyClosure("test", code, 1, false, [
            nSym,
            add1Sym,
            mul2Sym,
            one,
        ]);
        const result = vm.apply(fn, [six]);
        expect(result).toStrictEqual(new BunnyNumber(14));
    });
});
