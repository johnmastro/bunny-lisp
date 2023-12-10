import { BunnyEofError, BunnyInvalidStateError } from "../errors.ts";
import { IStream } from "./stream.interface.ts";

export class StringStream implements IStream {
    private pos: number = 0;

    constructor(private readonly data: string) {}

    peek(): string {
        if (this.eof()) {
            throw new BunnyEofError();
        }
        return this.data[this.pos]!;
    }

    read(): string {
        if (this.eof()) {
            throw new BunnyEofError();
        }
        return this.data[this.pos++]!;
    }

    unread(c: string): void {
        if (this.pos < 1) {
            throw new BunnyInvalidStateError("Can't unread what you haven't read");
        }
        if (c !== this.data[this.pos - 1]) {
            throw new BunnyInvalidStateError("That's not what we read");
        }
        this.pos--;
    }

    eof(): boolean {
        return this.pos >= this.data.length;
    }
}
