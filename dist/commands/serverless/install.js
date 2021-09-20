"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.builder = exports.desc = exports.command = void 0;
const child_process_1 = __importDefault(require("child_process"));
const settings_handler_1 = require("../../common/settings-handler");
exports.command = 'install';
exports.desc = "Install AWS serverless services";
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => {
    const serverless = ["willow-demo-services"];
    try {
        serverless.map((item) => {
            let cwd = `${argv.automationDir}/repositories/${item}`;
            console.log(`Installing serverless service from ${cwd}`);
            child_process_1.default.execSync(`npm install`, { cwd });
        });
    }
    catch (error) {
        console.log(error.message);
    }
};
exports.handler = handler;
