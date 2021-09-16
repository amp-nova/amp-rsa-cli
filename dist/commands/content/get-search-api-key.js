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
exports.command = 'get-search-api-key';
exports.desc = "Get Default Theme ID and save to global settings";
const handler = async (argv) => {
    try {
        let settingsYAML = fs_1.readFileSync(`./settings.yaml`).toString();
        fs_1.writeFileSync("settings.yaml.backup", settingsYAML);
        const settingsJSON = yaml.load(settingsYAML);
        console.log('Global settings loaded');
        const output = child_process_1.default.execSync(`dc-cli indexes list --json`).toString();
        const indexes = JSON.parse(output);
        if (indexes.length > 0) {
            const index = indexes[0];
            const searchKeyLink = index._links && index._links["hub-search-key"].href;
            if (searchKeyLink) {
                const apiKeyId = searchKeyLink.split('/').slice(-1)[0];
                const output = child_process_1.default.execSync(`dc-cli indexes get-search-api-key ${index.id} ${apiKeyId} --json`).toString();
                const key = JSON.parse(output);
                settingsJSON.algolia.appId = key.applicationId;
                settingsJSON.algolia.apiKey = key.key;
                console.log(`Saving global settings to file`);
                settingsYAML = yaml.dump(settingsJSON);
                fs_1.writeFileSync(`./settings.yaml`, settingsYAML);
            }
        }
    }
    catch (error) {
        console.log(error.message);
    }
};
exports.handler = handler;
