"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.desc = exports.command = void 0;
const fs_1 = require("fs");
const handlebars_1 = require("handlebars");
const child_process_1 = __importDefault(require("child_process"));
const yaml = require('js-yaml');
exports.command = 'generate-request';
exports.desc = "Generate Provisioning Request";
const handler = async (argv) => {
    try {
        let provisioningYAML = fs_1.readFileSync(`${argv.settingsDir}/provisioning.yaml`).toString();
        const provisioningJSON = yaml.load(provisioningYAML);
        const templateString = fs_1.readFileSync(`${argv.settingsDir}/assets/provisioning/request.yaml.hbs`).toString();
        const template = handlebars_1.compile(templateString);
        const contentJSON = template(provisioningJSON);
        try {
            child_process_1.default.execSync(`mkdir -p ${argv.settingsDir}/repositories/provisioning`);
        }
        catch (error) { }
        fs_1.writeFileSync(`${argv.settingsDir}/repositories/provisioning/request.yaml`, contentJSON);
    }
    catch (error) {
        console.log(error.message);
    }
};
exports.handler = handler;
