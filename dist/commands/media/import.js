"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.desc = exports.command = void 0;
const fs_1 = require("fs");
const child_process_1 = __importDefault(require("child_process"));
const yaml = require('js-yaml');
const lodash = require('lodash');
exports.command = 'import';
exports.desc = "Import media assets";
const delay = (ms) => new Promise(res => setTimeout(res, ms));
const handler = async (argv) => {
    try {
        let settingsYAML = fs_1.readFileSync(`./settings.yaml`).toString();
        fs_1.writeFileSync("settings.yaml.backup", settingsYAML);
        const settingsJSON = yaml.load(settingsYAML);
        console.log('Global settings loaded');
        const sourceType = settingsJSON.dam.source.type;
        if (sourceType === 's3') {
            const bucket = settingsJSON.dam.source.bucket;
            const region = settingsJSON.dam.source.region;
            child_process_1.default.execSync(`dam-cli assets import-s3 ${bucket} ${region} ${settingsJSON.dam.bucketsMap.assets}`);
            console.log('Importing assets from S3...');
            await delay(10000);
            child_process_1.default.execSync(`dam-cli assets publish-all ${settingsJSON.dam.bucketsMap.assets}`);
            console.log('Publishing all assets...');
            await delay(10000);
        }
    }
    catch (error) {
        console.log(error.message);
    }
};
exports.handler = handler;
