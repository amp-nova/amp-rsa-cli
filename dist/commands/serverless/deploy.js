"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const settings_handler_1 = require("../../common/settings-handler");
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
const childProcess = require('child_process');
exports.command = 'deploy';
exports.desc = "Deploy AWS serverless services";
const handle = (settingsJSON, argv) => {
    const serverless = [
        "willow-demo-services"
    ];
    serverless.map((item) => {
        console.log(`Deploying serverless service from ./repositories/${item}`);
        childProcess.execSync(`rm -rf .build && sls deploy --aws-profile ${settingsJSON.serverless.customProfileName}`, {
            cwd: `${argv.automationDir}/repositories/${item}`
        });
        console.log(`Saving serverless service information from ./repositories/${item}`);
        childProcess.execSync(`sls info --aws-profile ${settingsJSON.serverless.customProfileName} > deployment.yaml`, {
            cwd: `${argv.automationDir}/repositories/${item}`
        });
        childProcess.execSync(`sed -i -e '1,2d' deployment.yaml`, {
            cwd: `${argv.automationDir}/repositories/${item}`
        });
    });
};
