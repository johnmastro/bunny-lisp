import { VirtualMachine } from "./virtual-machine/virtual-machine.ts";
import { readString } from "./reader/reader.ts";
import * as printer from "./printer.ts";

async function repl(): Promise<void> {
    const vm = new VirtualMachine();
    process.stdout.write(">>> ");
    for await (const line of console) {
        if (line === ":exit") {
            return;
        }
        if (line !== "") {
            try {
                const form = readString(line);
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
        process.stdout.write(">>> ");
    }
}

repl();
