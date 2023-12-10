const isDebug = ["true", "1"].includes(process.env["DEBUG"] || "");

export function debug(s: string, o: Record<string, unknown>): void {
    if (isDebug) {
        console.log(s, o);
    }
}
