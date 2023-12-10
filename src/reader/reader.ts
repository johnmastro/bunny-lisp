import {
    BunnyList,
    BunnyNumber,
    BunnyObject,
    BunnyString,
    BunnySymbol,
    FALSE,
    NIL,
    TRUE,
} from "../data.ts";
import { StringStream } from "./string-stream.ts";
import * as symbolTable from "./symbol-table.ts";
import { BunnyEofError, BunnySyntaxError } from "../errors.ts";
import { IStream } from "./stream.interface.ts";
import * as fs from "fs";

export const EOF = new BunnySymbol("#eof");

const QUOTE = symbolTable.intern("quote");

export function readString(str: string): BunnyObject {
    const reader = Reader.fromString(str);
    return reader.read();
}

export class Reader {
    constructor(private readonly stream: IStream) {}

    static fromString(str: string): Reader {
        const stream = new StringStream(str);
        return new this(stream);
    }

    static fromFile(file: string): Reader {
        const buffer = fs.readFileSync(file);
        const str = buffer.toString();
        return this.fromString(str);
    }

    read(): BunnyObject {
        this.consumeWhitespace();
        if (this.stream.eof()) {
            return EOF;
        }
        const c = this.stream.peek();
        if (c === "(") {
            return this.readList();
        }
        if (c === '"') {
            return this.readString();
        }
        if (c === "'") {
            return this.readWrapped(QUOTE);
        }
        if (isDelimiter(c)) {
            throw new BunnySyntaxError(`Invalid syntax: '${c}'`);
        }
        return this.readAtom();
    }

    private readList(): BunnyObject {
        const result: BunnyObject[] = [];
        let c = this.stream.read();
        if (c !== "(") {
            throw new BunnySyntaxError("Expected opening list delimiter");
        }
        for (;;) {
            this.consumeWhitespace();
            if (this.stream.eof()) {
                throw new BunnySyntaxError("list");
            }
            c = this.stream.read();
            if (c === ")") {
                return result.length === 0 ? NIL : new BunnyList(result);
            }
            this.stream.unread(c);
            const value = this.read();
            result.push(value);
        }
    }

    private readString(): BunnyObject {
        let result = "";
        let c = this.stream.read();
        if (c !== '"') {
            throw new BunnySyntaxError("Expected opening string delimiter");
        }
        for (;;) {
            if (this.stream.eof()) {
                throw new BunnyEofError("string");
            }
            c = this.stream.read();
            if (c === '"') {
                return new BunnyString(result);
            }
            result += c;
        }
    }

    private readAtom(): BunnyObject {
        const token = this.readToken();
        switch (token) {
            case "true":
                return TRUE;
            case "false":
                return FALSE;
            case "nil":
                return NIL;
            default: {
                if (token.startsWith("#")) {
                    throw new BunnySyntaxError('Invalid syntax: "#"');
                }
                const asNumber = Number(token);
                if (!isNaN(asNumber)) {
                    return new BunnyNumber(asNumber);
                }
                return symbolTable.intern(token);
            }
        }
    }

    private readToken(): string {
        let result = "";
        while (!this.stream.eof()) {
            const c = this.stream.read();
            if (isDelimiter(c)) {
                this.stream.unread(c);
                break;
            }
            result += c;
        }
        return result;
    }

    private readWrapped(symbol: BunnySymbol): BunnyList {
        this.stream.read(); // Move past the sigil
        const form = this.read();
        return new BunnyList([symbol, form]);
    }

    private consumeWhitespace(): void {
        if (this.stream.eof()) {
            return;
        }
        let c: string;
        do {
            c = this.stream.read();
            if (c === ";") {
                this.consumeComment();
                if (this.stream.eof()) {
                    return;
                }
                c = this.stream.read();
            }
        } while (isWhitespace(c) && !this.stream.eof());
        if (!isWhitespace(c)) {
            this.stream.unread(c);
        }
    }

    private consumeComment(): void {
        if (this.stream.eof()) {
            return;
        }
        let c: string;
        do {
            c = this.stream.read();
        } while (c != "\n" && !this.stream.eof());
        this.stream.unread(c);
    }
}

function isWhitespace(c: string): boolean {
    return [" ", "\t", "\n", "\r"].includes(c);
}

function isDelimiter(c: string): boolean {
    return isWhitespace(c) || ["(", ")", '"', ";", "'"].includes(c);
}
