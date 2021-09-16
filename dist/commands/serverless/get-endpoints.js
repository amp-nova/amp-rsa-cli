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
exports.command = 'get-endpoints';
exports.desc = "Get AWS serverless services endpoints and save to settings";
const handler = async (argv) => {
    const serverless = [
        "willow-demo-services"
    ];
    try {
        let settingsYAML = fs_1.readFileSync(`./settings.yaml`).toString();
        fs_1.writeFileSync("settings.yaml.backup", settingsYAML);
        const settingsJSON = yaml.load(settingsYAML);
        console.log('Global settings loaded');
        settingsJSON.serverless.services = {};
        serverless.map((item) => {
            console.log(`Saving serverless service information from ./repositories/${item}`);
            child_process_1.default.execSync(`sls info --aws-profile ${settingsJSON.serverless.customProfileName} > deployment.yaml`, { cwd: `./repositories/${item}` });
            child_process_1.default.execSync(`sed -i -e '1,2d' deployment.yaml`, { cwd: `./repositories/${item}` });
            console.log(`Loading serverless service information from ./repositories/${item}`);
            const deploymentYAML = fs_1.readFileSync(`./repositories/${item}/deployment.yaml`).toString();
            const deploymentJSON = yaml.load(deploymentYAML);
            const endpointEntry = deploymentJSON.endpoints;
            let endpoint = endpointEntry.split(' - ')[1].replace("{proxy+}", "");
            if (endpoint[endpoint.length - 1] === '/') {
                endpoint = endpoint.substr(0, endpoint.length - 1);
            }
            const service = deploymentJSON.service;
            console.log(`Service: ${service}`);
            console.log(`Endpoint: ${endpoint}`);
            const serviceCamelCase = lodash.camelCase(item);
            settingsJSON.serverless.services[serviceCamelCase] = {
                service,
                endpoint
            };
        });
        console.log(`Saving global settings to file`);
        settingsYAML = yaml.dump(settingsJSON);
        fs_1.writeFileSync(`./settings.yaml`, settingsYAML);
    }
    catch (error) {
        console.log(error.message);
    }
};
exports.handler = handler;
