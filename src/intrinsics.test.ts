import { describe, test, expect } from "bun:test";
import { intrinsics } from "./intrinsics.ts";
import { BunnyNumber } from "./data.ts";

const one = new BunnyNumber(1);
const two = new BunnyNumber(2);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockVm = undefined as any;

describe("intrinsics", () => {
    describe("+", () => {
        test("returns 0 if called with zero args", () => {
            const result = intrinsics["+"](mockVm, []);
            expect(result).toStrictEqual(new BunnyNumber(0));
        });
        test("returns the sum of the numbers", () => {
            const result = intrinsics["+"](mockVm, [one, two]);
            expect(result).toStrictEqual(new BunnyNumber(3));
        });
    });
});
