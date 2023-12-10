import {
    BunnyClosure,
    BunnyFunction,
    BunnyObject,
    BunnyType,
    Environment,
} from "../data.ts";
import { BunnyInvalidStateError } from "../errors.ts";
import { printLn } from "../printer.ts";

export type StackElement = BunnyObject | Environment | number;

export function getObject(stack: StackElement[], index: number): BunnyObject {
    const result = getElement(stack, index);
    if (typeof result === "object" && "type" in result) {
        return result;
    }
    throw new BunnyInvalidStateError(`Expected an object, found ${result}`);
}

export function getObjects(
    stack: StackElement[],
    start: number,
    end: number,
): BunnyObject[] {
    const result: BunnyObject[] = [];
    for (let i = start; i < end; i++) {
        const item = stack[i];
        if (!(typeof item === "object" && "type" in item)) {
            throw new BunnyInvalidStateError(
                `Expected object at top of stack, found ${item}`,
            );
        }
        result.push(item);
    }
    return result;
}

export function getFunction(stack: StackElement[], index: number): BunnyFunction {
    const result = getObject(stack, index);
    if (result.type === BunnyType.closure || result.type === BunnyType.intrinsic) {
        return result;
    }
    printLn(result);
    throw new BunnyInvalidStateError(`Expected a function, found ${result}`);
}

export function getClosure(stack: StackElement[], index: number): BunnyClosure {
    const result = getObject(stack, index);
    if (result.type === BunnyType.closure) {
        return result;
    }
    throw new BunnyInvalidStateError(`Expected a closure, found ${result}`);
}

export function getNumber(stack: StackElement[], index: number): number {
    const result = getElement(stack, index);
    if (typeof result === "number") {
        return result;
    }
    throw new BunnyInvalidStateError(`Expected an object, found ${result}`);
}

export function getEnvironment(stack: StackElement[], index: number): Environment {
    const result = getElement(stack, index);
    if (result instanceof Environment) {
        return result;
    }
    throw new BunnyInvalidStateError(`Expected an environment, found ${result}`);
}

export function maybeGrow(stack: StackElement[], size: number): void {
    if (size > stack.length) {
        stack.length = Math.max(size + 32, Math.ceil(stack.length * 1.5));
    }
}

export function reset(stack: StackElement[], size: number): void {
    stack.length = 0;
    stack.length = size;
}

function getElement(stack: StackElement[], index: number): StackElement {
    checkIndex(stack, index);
    const result = stack[index];
    if (typeof result !== "number" && !result) {
        throw new BunnyInvalidStateError(`Nothing there at index ${index}`);
    }
    return result;
}

function checkIndex(stack: StackElement[], index: number): void {
    if (index < 0 || index >= stack.length) {
        throw new BunnyInvalidStateError(`Invalid stack index ${index}`);
    }
}
