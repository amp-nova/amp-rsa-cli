"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.desc = exports.command = void 0;
const child_process_1 = __importDefault(require("child_process"));
exports.command = 'install';
exports.desc = "Install AWS serverless services";
const handler = async (argv) => {
    const serverless = [
        "willow-demo-services"
    ];
    try {
        serverless.map((item) => {
            console.log(`Installing serverless service from ./repositories/${item}`);
            child_process_1.default.execSync(`npm install`, { cwd: `./repositories/${item}` });
        });
    }
    catch (error) {
        console.log(error.message);
    }
};
exports.handler = handler;
