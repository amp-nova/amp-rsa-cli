"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const settings_handler_1 = require("../common/settings-handler");
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
exports.command = 'configure';
exports.desc = 'Configure CLIs';
const handle = (settingsJSON, argv) => {
    const childProcess = require('child_process');
    console.log('Configure dc-cli...');
    childProcess.execSync(`npx @amplience/dc-cli configure --clientId ${settingsJSON.cms.clientId} --clientSecret ${settingsJSON.cms.clientSecret} --hubId ${settingsJSON.cms.hubId}`, {
        cwd: argv.settingsDir
    });
    if (settingsJSON.dam.username) {
        console.log('Configure dam-cli...');
        childProcess.execSync(`npx amp-nova/dam-cli configure --username ${settingsJSON.dam.username} --password ${settingsJSON.dam.password}`);
    }
    if (false && settingsJSON.serverless.accessKeyId) {
        console.log('Configure aws cli...');
        childProcess.execSync(`serverless config credentials --provider aws --key ${settingsJSON.serverless.accessKeyId} --secret ${settingsJSON.serverless.secretAccessKey} --profile ${settingsJSON.serverless.customProfileName}`);
    }
};
