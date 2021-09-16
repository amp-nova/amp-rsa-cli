"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.desc = exports.command = void 0;
const child_process_1 = __importDefault(require("child_process"));
const fs_1 = require("fs");
const yaml = require('js-yaml');
exports.command = 'deploy';
exports.desc = "Deploy Web Application";
const handler = async (argv) => {
    try {
        let settingsYAML = fs_1.readFileSync(`./settings.yaml`).toString();
        const settingsJSON = yaml.load(settingsYAML);
        console.log('Global settings loaded');
        const webapp = settingsJSON.app.appName.toLowerCase();
        const scope = settingsJSON.app.scope;
        console.log(`Deploying Web Application to Vercel`);
        child_process_1.default.execSync(`vercel --prod --confirm --name ${webapp} --scope ${scope} &> ./automation/repositories/deployment.out`, {
            cwd: `..`,
            stdio: [process.stdin, process.stdout, process.stdin]
        });
        const deploymentOutput = fs_1.readFileSync(`./repositories/deployment.out`).toString();
        fs_1.writeFileSync("settings.yaml.backup", settingsYAML);
        const regex = /Production: (.*?) /;
        const matches = regex.exec(deploymentOutput);
        if (matches && matches.length === 2) {
            const url = matches[1];
            settingsJSON.app.url = url;
            console.log(`Saving global settings to file`);
            settingsYAML = yaml.dump(settingsJSON);
            fs_1.writeFileSync(`./settings.yaml`, settingsYAML);
        }
    }
    catch (error) {
        console.log(error.message);
    }
};
exports.handler = handler;
