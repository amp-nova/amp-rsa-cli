"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const settings_handler_1 = require("../../common/settings-handler");
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
exports.command = 'get-assets';
exports.desc = "Get media assets";
const handle = (settingsJSON) => {
    const childProcess = require('child_process');
    const lodash = require('lodash');
    console.log(`Listing Assets`);
    const assetsList = childProcess.execSync(`./node_modules/.bin/dam-cli assets list ${settingsJSON.dam.bucketsMap.assets} --json`).toString();
    const assetsListJson = JSON.parse(assetsList);
    let imagesMap = {};
    assetsListJson.forEach((item) => {
        const imageName = lodash.camelCase(item.name);
        const id = item.id;
        imagesMap[imageName] = id;
    });
    settingsJSON.dam.imagesMap = imagesMap;
};
