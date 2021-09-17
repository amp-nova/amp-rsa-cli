"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const settings_handler_1 = require("../../common/settings-handler");
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => await settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
exports.command = 'import';
exports.desc = "Import media assets";
const childProcess = require('child_process');
const delay = (ms) => new Promise(res => setTimeout(res, ms));
const handle = async (settingsJSON) => {
    const sourceType = settingsJSON.dam.source.type;
    if (sourceType === 's3') {
        const bucket = settingsJSON.dam.source.bucket;
        const region = settingsJSON.dam.source.region;
        childProcess.execSync(`./node_modules/.bin/dam-cli assets import-s3 ${bucket} ${region} ${settingsJSON.dam.bucketsMap.assets}`);
        console.log('Importing assets from S3...');
        await delay(10000);
        childProcess.execSync(`./node_modules/.bin/dam-cli assets publish-all ${settingsJSON.dam.bucketsMap.assets}`);
        console.log('Publishing all assets...');
        await delay(10000);
    }
};
