"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const settings_handler_1 = require("../../common/settings-handler");
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
exports.command = 'get-content-item-by-key';
exports.desc = "Get Content Item by key and save ID to global settings";
const childProcess = require('child_process');
const lodash = require('lodash');
const handle = (settingsJSON) => {
    console.log(`Listing Content Items`);
    const contentItems = childProcess.execSync(`npx @amplience/dc-cli content-item list --json`).toString();
    const contentItemsJSON = JSON.parse(contentItems);
    let contentItemsMap = {};
    contentItemsJSON.map((item) => {
        const itemName = lodash.camelCase(item.label);
        contentItemsMap[itemName] = item.id;
    });
    settingsJSON.cms.contentItemsMap = contentItemsMap;
};
