"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const settings_handler_1 = require("../../common/settings-handler");
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
const childProcess = require('child_process');
exports.command = 'get-search-api-key';
exports.desc = "Get Default Theme ID and save to global settings";
const handle = (settingsJSON) => {
    const output = childProcess.execSync(`npx dc-cli indexes list --json`).toString();
    const indexes = JSON.parse(output);
    if (indexes.length > 0) {
        const index = indexes[0];
        const searchKeyLink = index._links && index._links["hub-search-key"].href;
        if (searchKeyLink) {
            const apiKeyId = searchKeyLink.split('/').slice(-1)[0];
            const output = childProcess.execSync(`npx dc-cli indexes get-search-api-key ${index.id} ${apiKeyId} --json`).toString();
            const key = JSON.parse(output);
            settingsJSON.algolia.appId = key.applicationId;
            settingsJSON.algolia.apiKey = key.key;
        }
    }
};
