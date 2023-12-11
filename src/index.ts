import { VirtualMachine } from "./virtual-machine/virtual-machine.ts";
import { readString } from "./reader/reader.ts";
import * as printer from "./printer.ts";

function repl(): void {
    const vm = new VirtualMachine();
    for (;;) {
        const input = prompt(">>>");
        if (!input) {
            continue;
        }
        if (input === ":exit") {
            break;
        }
        try {
            const form = readString(input);
            const thunk = vm.compileThunk(form);
            const result = vm.apply(thunk, []);
            printer.printLn(result);
        } catch (e) {
            if (e instanceof Error) {
                process.stdout.write(`${e.name}: ${e.message}\n`);
            } else {
                process.stdout.write(`${String(e)}\n`);
            }
            vm.reset();
        }
    }
}

repl();
