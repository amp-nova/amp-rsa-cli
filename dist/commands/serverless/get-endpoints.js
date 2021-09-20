"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const settings_handler_1 = require("../../common/settings-handler");
const fs_1 = require("fs");
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
const childProcess = require('child_process');
const _ = require('lodash');
const yaml = require('js-yaml');
exports.command = 'get-endpoints';
exports.desc = "Get AWS serverless services endpoints and save to settings";
const handle = (settingsJSON, argv) => {
    const serverless = ["willow-demo-services"];
    settingsJSON.serverless.services = {};
    serverless.map((item) => {
        let cwd = `${argv.automationDir}/repositories/${item}`;
        console.log(`Saving serverless service information from ./repositories/${item}`);
        childProcess.execSync(`sls info --aws-profile ${settingsJSON.serverless.customProfileName} > deployment.yaml`, { cwd });
        childProcess.execSync(`sed -i -e '1,2d' deployment.yaml`, { cwd });
        console.log(`Loading serverless service information from ${cwd}`);
        const deploymentYAML = fs_1.readFileSync(`${cwd}/deployment.yaml`).toString();
        const deploymentJSON = yaml.load(deploymentYAML);
        const endpointEntry = deploymentJSON.endpoints;
        let endpoint = endpointEntry.split(' - ')[1].replace("{proxy+}", "");
        if (endpoint[endpoint.length - 1] === '/') {
            endpoint = endpoint.substr(0, endpoint.length - 1);
        }
        const service = deploymentJSON.service;
        console.log(`Service: ${service}`);
        console.log(`Endpoint: ${endpoint}`);
        const serviceCamelCase = _.camelCase(item);
        settingsJSON.serverless.services[serviceCamelCase] = { service, endpoint };
    });
};
