"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.desc = exports.command = void 0;
exports.command = 'import';
exports.desc = "Import commerce assets";
const handler = async (argv) => {
    console.log("Importing product types");
    console.log("Importing categories");
    console.log("Importing products");
};
exports.handler = handler;
