// declare const tempDir: string;

declare module NodeJS {
    interface Global {
        tempDir: string
    }
}