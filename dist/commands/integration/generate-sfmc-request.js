"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const fs_1 = require("fs");
const settings_handler_1 = require("../../common/settings-handler");
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
const childProcess = require('child_process');
const yaml = require('js-yaml');
const handlebars_1 = require("handlebars");
exports.command = 'generate-sfmc-request';
exports.desc = "Generate SalesForce Marketing Cloud Integration Request";
const handle = (settingsJSON, argv) => {
    let intSettingsYAML = fs_1.readFileSync(`${argv.settingsDir}/integration.yaml`).toString();
    const intSettingsJSON = yaml.load(intSettingsYAML);
    const finalSettingsJSON = {
        ...settingsJSON,
        ...intSettingsJSON
    };
    const templateString = fs_1.readFileSync(`${argv.settingsDir}/assets/integration/sfmc.json.hbs`).toString();
    const template = handlebars_1.compile(templateString);
    const contentJSON = template(finalSettingsJSON);
    try {
        childProcess.execSync(`mkdir -p ${argv.settingsDir}/repositories/integration`);
    }
    catch (error) { }
    fs_1.writeFileSync(`${argv.settingsDir}/repositories/integration/sfmc.json`, contentJSON);
    console.log('Integration request saved to repositories/integration folder');
};
