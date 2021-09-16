"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.desc = exports.command = void 0;
const fs_1 = require("fs");
const child_process_1 = __importDefault(require("child_process"));
const yaml = require('js-yaml');
const lodash = require('lodash');
exports.command = 'get-workflow-states';
exports.desc = "Get Workflow States map and save to global settings";
const handler = async (argv) => {
    try {
        let settingsYAML = fs_1.readFileSync(`./settings.yaml`).toString();
        fs_1.writeFileSync("settings.yaml.backup", settingsYAML);
        const settingsJSON = yaml.load(settingsYAML);
        console.log('Global settings loaded');
        console.log(`Listing Workflow States`);
        const workflowStatesList = child_process_1.default.execSync(`dc-cli workflow-states list --json`, { cwd: `./repositories` }).toString();
        const workflowStateJson = JSON.parse(workflowStatesList);
        let workflowStatesMap = {};
        workflowStateJson.map((item) => {
            const workflowStatesName = lodash.camelCase(item.label);
            if (!workflowStatesName.startsWith('unused')
                && !workflowStatesName.startsWith('archived')) {
                workflowStatesMap[workflowStatesName] = item.id;
            }
        });
        settingsJSON.cms.workflowStates = workflowStatesMap;
        console.log(`Saving global settings to file`);
        settingsYAML = yaml.dump(settingsJSON);
        fs_1.writeFileSync(`./settings.yaml`, settingsYAML);
    }
    catch (error) {
        console.log(error.message);
    }
};
exports.handler = handler;
