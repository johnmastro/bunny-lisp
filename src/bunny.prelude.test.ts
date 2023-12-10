import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { VirtualMachine } from "./virtual-machine/virtual-machine.ts";
import {
    BunnyClosure,
    BunnyList,
    BunnyNumber,
    BunnyString,
    FALSE,
    NIL,
    TRUE,
} from "./data.ts";

const vm = new VirtualMachine();

describe("prelude", () => {
    beforeAll(() => {
        vm.loadFile("prelude.bunny");
    });
    afterEach(() => {
        vm.reset();
    });
    test.skip("can load it", () => {
        const result = vm.loadFile("prelude.bunny");
        expect(result).toBeInstanceOf(BunnyClosure);
    });
    describe("closure", () => {
        test("bank balance", () => {
            const result = vm.loadString(`
            (def bank
              (let ((balance 0))
                (list (fn deposit! (n)
                        (set! balance (+ balance n)))
                      (fn withdraw! (n)
                        (set! balance (- balance n)))
                      (fn check-balance ()
                        balance))))
    
            (def deposit! (first bank))
            (def withdraw! (second bank))
            (def check-balance (third bank))
    
            (deposit! 100)
            (withdraw! 50)
            (deposit! 100)
            (check-balance)
            `);
            expect(result).toStrictEqual(new BunnyNumber(150));
        });
        test("nested scopes", () => {
            const result = vm.loadString(`
            (def nested-scopes
              (let ((outer nil))
                (let ((middle nil))
                  (let ((inner nil))
                    (list (fn set-outer! (x) (set! outer x))
                          (fn set-middle! (x) (set! middle x))
                          (fn set-inner! (x) (set! inner x))
                          (fn concat-em () (concat outer middle inner)))))))

            (def set-outer! (first nested-scopes))
            (def set-middle! (second nested-scopes))
            (def set-inner! (third nested-scopes))
            (def concat-em (fourth nested-scopes))

            (set-outer! "hello")
            (set-middle! " ")
            (set-inner! "world!")
            (concat-em)
            `);
            expect(result).toStrictEqual(new BunnyString("hello world!"));
        });
    });
    describe("number?", () => {
        test("false", () => {
            const result = vm.loadString(`(number? "foo")`);
            expect(result).toStrictEqual(FALSE);
        });
        test("true", () => {
            const result = vm.loadString(`(number? 1)`);
            expect(result).toStrictEqual(TRUE);
        });
    });
    test("map", () => {
        const result = vm.loadString(`
            (def ns (list 1 2 3))
            (def add1 (fn (n) (+ n 1)))
            (map add1 ns)
        `);
        expect(result).toStrictEqual(
            new BunnyList([new BunnyNumber(2), new BunnyNumber(3), new BunnyNumber(4)]),
        );
    });
    test("filter", () => {
        const result = vm.loadString(`
            (def stuff (list 1 "two" 3 "four"))
            (filter number? stuff)
        `);
        expect(result).toStrictEqual(
            new BunnyList([new BunnyNumber(1), new BunnyNumber(3)]),
        );
    });
    describe("do", () => {
        test("with no expressions", () => {
            const result = vm.loadString("(do)");
            expect(result).toStrictEqual(NIL);
        });
        test("with one expression", () => {
            const result = vm.loadString("(do (+ 1 2))");
            expect(result).toStrictEqual(new BunnyNumber(3));
        });
        test("with two expressions", () => {
            const result = vm.loadString("(do (+ 1 2) (+ 3 4))");
            expect(result).toStrictEqual(new BunnyNumber(7));
        });
    });
    describe("let", () => {
        test("with no bindings", () => {
            const result = vm.loadString("(let () (+ 1 1))");
            expect(result).toStrictEqual(new BunnyNumber(2));
        });
        test("with one binding", () => {
            const result = vm.loadString("(let ((n 1)) (+ n 1))");
            expect(result).toStrictEqual(new BunnyNumber(2));
        });
        test("with two bindings", () => {
            const result = vm.loadString("(let ((n 1) (m 1)) (+ n m))");
            expect(result).toStrictEqual(new BunnyNumber(2));
        });
        test("with multiple expressions in body", () => {
            const result = vm.loadString(`
            (let ((n 1) (m 1)) (+ n m) (* 2 (+ n m)))
            `);
            expect(result).toStrictEqual(new BunnyNumber(4));
        });
    });
    describe("letfn", () => {
        test("with no bindings", () => {
            const result = vm.loadString("(letfn () (+ 1 1))");
            expect(result).toStrictEqual(new BunnyNumber(2));
        });
        test("with one binding", () => {
            const result = vm.loadString("(letfn ((add1 (n) (+ n 1))) (add1 1))");
            expect(result).toStrictEqual(new BunnyNumber(2));
        });
        test("with two binding", () => {
            const result = vm.loadString(`
            (letfn ((add1 (n) (+ n 1)) (mul2 (n) (* n 2))) (mul2 (add1 1)))
            `);
            expect(result).toStrictEqual(new BunnyNumber(4));
        });
    });
    describe("or", () => {
        test("with no expressions", () => {
            const result = vm.loadString("(or)");
            expect(result).toStrictEqual(NIL);
        });
        test("with one expression", () => {
            const trueResult = vm.loadString("(or true)");
            expect(trueResult).toStrictEqual(TRUE);
            const falseResult = vm.loadString("(or false)");
            expect(falseResult).toStrictEqual(FALSE);
        });
        test("with two expression", () => {
            const trueResult = vm.loadString("(or nil true)");
            expect(trueResult).toStrictEqual(TRUE);
            const falseResult = vm.loadString("(or false nil)");
            expect(falseResult).toStrictEqual(NIL);
        });
    });
    describe("and", () => {
        test("with no expressions", () => {
            const result = vm.loadString("(and)");
            expect(result).toStrictEqual(TRUE);
        });
        test("with one expression", () => {
            const trueResult = vm.loadString("(and true)");
            expect(trueResult).toStrictEqual(TRUE);
            const falseResult = vm.loadString("(and false)");
            expect(falseResult).toStrictEqual(FALSE);
        });
        test("with two expression", () => {
            const trueResult = vm.loadString("(and true nil)");
            expect(trueResult).toStrictEqual(NIL);
            const falseResult = vm.loadString("(and true true)");
            expect(falseResult).toStrictEqual(TRUE);
        });
    });
    describe("range", () => {
        test("zero length", () => {
            const result = vm.loadString("(range 0 0)");
            expect(result).toStrictEqual(NIL);
        });
        test("positive length", () => {
            const result = vm.loadString("(range 0 2)");
            expect(result).toStrictEqual(new BunnyList([
                new BunnyNumber(0),
                new BunnyNumber(1)
            ]));
        });
    })
});
