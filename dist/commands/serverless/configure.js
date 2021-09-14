"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.desc = exports.command = void 0;
const fs_1 = require("fs");
const handlebars_1 = require("handlebars");
const yaml = require('js-yaml');
exports.command = 'configure';
exports.desc = "Configure AWS serverless services";
const handler = async (argv) => {
    const serverless = [
        "willow-demo-services"
    ];
    try {
        const settings = fs_1.readFileSync(`./settings.yaml`).toString();
        const settingsJson = yaml.load(settings);
        console.log('Global settings loaded');
        serverless.map((item) => {
            const configTemplate = fs_1.readFileSync(`./assets/serverless/${item}/serverless.yml.hbs`).toString();
            const configTemplateCompiled = handlebars_1.compile(configTemplate);
            const serverlessConfigYAML = configTemplateCompiled(settingsJson);
            fs_1.writeFileSync(`./repositories/${item}/serverless.yml`, serverlessConfigYAML);
            console.log(`Wrote serverless config to file ./repositories/${item}/serverless.yml`);
        });
    }
    catch (error) {
        console.log(error.message);
    }
};
exports.handler = handler;
