"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const settings_handler_1 = require("../../common/settings-handler");
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
const childProcess = require('child_process');
const lodash = require('lodash');
const path = require('path');
exports.command = 'get-workflow-states';
exports.desc = "Get Workflow States map and save to global settings";
const handle = (settingsJSON, argv) => {
    console.log(`Listing Workflow States`);
    let settingsPath = ;
    const workflowStatesList = childProcess.execSync(`./node_modules/.bin/dc-cli workflow-states list --json`, { cwd: `${argv.settingsYaml}/repositories` }).toString();
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
};
