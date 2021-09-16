"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.desc = exports.command = void 0;
exports.command = 'list';
exports.desc = "List AWS serverless services";
const handler = async (argv) => {
    console.log("Listing serverless services");
};
exports.handler = handler;
