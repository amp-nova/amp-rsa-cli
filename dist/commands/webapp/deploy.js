"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const fs_1 = require("fs");
const settings_handler_1 = require("../../common/settings-handler");
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
const childProcess = require('child_process');
const lodash = require('lodash');
exports.command = 'deploy';
exports.desc = "Deploy Web Application";
const handle = (settingsJSON, argv) => {
    const webapp = settingsJSON.app.appName.toLowerCase();
    const scope = settingsJSON.app.scope;
    console.log(`Deploying Web Application to Vercel`);
    childProcess.execSync(`vercel --prod --confirm --name ${webapp} --scope ${scope} &> ./automation/repositories/deployment.out`, {
        cwd: `..`,
        stdio: [process.stdin, process.stdout, process.stdin]
    });
    const deploymentOutput = fs_1.readFileSync(`${argv.settingsDir}/repositories/deployment.out`).toString();
    const regex = /Production: (.*?) /;
    const matches = regex.exec(deploymentOutput);
    if (matches && matches.length === 2) {
        const url = matches[1];
        settingsJSON.app.url = url;
    }
};
