"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const settings_handler_1 = require("../../common/settings-handler");
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
exports.command = 'get-buckets';
exports.desc = "Get media buckets";
const handle = (settingsJSON) => {
    const childProcess = require('child_process');
    const lodash = require('lodash');
    console.log(`Listing Buckets`);
    const bucketsList = childProcess.execSync(`./node_modules/.bin/dam-cli buckets list --json`).toString();
    const bucketsListJson = JSON.parse(bucketsList);
    let bucketsMap = {};
    bucketsListJson.forEach((item) => {
        const bucketName = lodash.camelCase(item.label);
        const id = item.id;
        bucketsMap[bucketName] = id;
    });
    settingsJSON.dam.bucketsMap = bucketsMap;
};
