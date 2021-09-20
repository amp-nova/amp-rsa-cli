"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.builder = exports.desc = exports.command = void 0;
const handlebars_1 = require("handlebars");
const settings_handler_1 = require("../../common/settings-handler");
const fs = require('fs-extra');
const yaml = require('js-yaml');
exports.command = 'generate-request';
exports.desc = "Generate Provisioning Request";
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => {
    try {
        let provisioningYAML = fs.readFileSync(`${argv.automationDir}/provisioning.yaml`).toString();
        const provisioningJSON = yaml.load(provisioningYAML);
        const templateString = fs.readFileSync(`${argv.automationDir}/assets/provisioning/request.yaml.hbs`).toString();
        const template = handlebars_1.compile(templateString);
        const contentJSON = template(provisioningJSON);
        fs.mkdirpSync(`${argv.automationDir}/repositories/provisioning`);
        fs.writeFileSync(`${argv.automationDir}/repositories/provisioning/request.yaml`, contentJSON);
    }
    catch (error) {
        console.log(error.message);
    }
};
exports.handler = handler;
