"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const settings_handler_1 = require("../../common/settings-handler");
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
const childProcess = require('child_process');
exports.command = 'remove';
exports.desc = "Remove AWS serverless services";
const handle = (settingsJSON, argv) => {
    const serverless = [
        "willow-demo-services"
    ];
    serverless.map((item) => {
        let cwd = `${argv.automationDir}/repositories/${item}`;
        console.log(`Removing serverless service from ${cwd}`);
        childProcess.execSync(`sls remove --aws-profile ${settingsJSON.serverless.customProfileName}`, { cwd });
    });
};
