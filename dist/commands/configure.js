"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.desc = exports.command = void 0;
const child_process_1 = __importDefault(require("child_process"));
const fs_1 = require("fs");
const yaml = require('js-yaml');
exports.command = 'configure';
exports.desc = 'Configure CLIs';
const handler = async (argv) => {
    console.log("Configuring all CLIs");
    try {
        let settingsYAML = fs_1.readFileSync(`./settings.yaml`).toString();
        const settingsJSON = yaml.load(settingsYAML);
        console.log('Global settings loaded');
        console.log('Configure dc-cli...');
        child_process_1.default.execSync(`dc-cli configure --clientId ${settingsJSON.cms.clientId} --clientSecret ${settingsJSON.cms.clientSecret} --hubId ${settingsJSON.cms.hubId}`);
        if (settingsJSON.dam.username) {
            console.log('Configure dam-cli...');
            child_process_1.default.execSync(`dam-cli configure --username ${settingsJSON.dam.username} --password ${settingsJSON.dam.password}`);
        }
        if (settingsJSON.serverless.accessKeyId) {
            console.log('Configure aws cli...');
            child_process_1.default.execSync(`serverless config credentials --provider aws --key ${settingsJSON.serverless.accessKeyId} --secret ${settingsJSON.serverless.secretAccessKey} --profile ${settingsJSON.serverless.customProfileName}`);
        }
    }
    catch (error) {
        console.log(error.message);
    }
};
exports.handler = handler;
