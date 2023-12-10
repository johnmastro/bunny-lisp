export interface IStream {
    peek(): string;
    read(): string;
    unread(c: string): void;
    eof(): boolean;
}
