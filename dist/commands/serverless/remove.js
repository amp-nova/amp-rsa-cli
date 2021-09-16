"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.desc = exports.command = void 0;
const child_process_1 = __importDefault(require("child_process"));
const fs_1 = require("fs");
const yaml = require('js-yaml');
exports.command = 'remove';
exports.desc = "Remove AWS serverless services";
const handler = async (argv) => {
    const serverless = [
        "willow-demo-services"
    ];
    try {
        let settingsYAML = fs_1.readFileSync(`./settings.yaml`).toString();
        fs_1.writeFileSync("settings.yaml.backup", settingsYAML);
        const settingsJSON = yaml.load(settingsYAML);
        console.log('Global settings loaded');
        serverless.map((item) => {
            console.log(`Removing serverless service from ./repositories/${item}`);
            child_process_1.default.execSync(`sls remove --aws-profile ${settingsJSON.serverless.customProfileName}`, { cwd: `./repositories/${item}` });
        });
    }
    catch (error) {
        console.log(error.message);
    }
};
exports.handler = handler;
