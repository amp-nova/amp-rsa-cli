// declare const tempDir: string;

declare namespace NodeJS {
    interface Global {
        tempDir: string
    }
}

// declare module NodeJS {
//     interface Global {
//         tempDir: string
//     }
// }