"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const settings_handler_1 = require("../../common/settings-handler");
const handlebars_1 = require("handlebars");
const fs_1 = require("fs");
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
const childProcess = require('child_process');
exports.command = 'configure';
exports.desc = "Configure AWS serverless services";
const handle = (settingsJSON, argv) => {
    const serverless = [
        "willow-demo-services"
    ];
    serverless.map((item) => {
        const configTemplate = fs_1.readFileSync(`${argv.settingsDir}/assets/serverless/${item}/serverless.yml.hbs`).toString();
        const configTemplateCompiled = handlebars_1.compile(configTemplate);
        const serverlessConfigYAML = configTemplateCompiled(settingsJSON);
        let dir = `${argv.settingsDir}/repositories/${item}`;
        try {
            childProcess.execSync(`mkdir -p ${dir}`);
        }
        catch (error) { }
        fs_1.writeFileSync(`${dir}/serverless.yml`, serverlessConfigYAML);
        console.log(`Wrote serverless config to file ${dir}/serverless.yml`);
    });
};
