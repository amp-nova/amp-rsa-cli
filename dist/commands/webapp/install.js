"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.desc = exports.command = void 0;
const child_process_1 = __importDefault(require("child_process"));
const fs_1 = require("fs");
const yaml = require('js-yaml');
exports.command = 'install';
exports.desc = "Install Web Application";
const handler = async (argv) => {
    try {
        let settingsYAML = fs_1.readFileSync(`./settings.yaml`).toString();
        const settingsJSON = yaml.load(settingsYAML);
        console.log('Global settings loaded');
        console.log(`Installing Web Application from ..`);
        child_process_1.default.execSync(`yarn install`, { cwd: `..` });
    }
    catch (error) {
        console.log(error.message);
    }
};
exports.handler = handler;
