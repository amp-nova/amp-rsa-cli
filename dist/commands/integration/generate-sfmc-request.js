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
exports.command = 'generate-sfmc-request';
exports.desc = "Generate SalesForce Marketing Cloud Integration Request";
const handler = async (argv) => {
    try {
        let intSettingsYAML = fs_1.readFileSync(`./settings.yaml`).toString();
        let settingsYAML = fs_1.readFileSync(`./integration.yaml`).toString();
        const intSettingsJSON = yaml.load(intSettingsYAML);
        const settingsJSON = yaml.load(settingsYAML);
        console.log('Global settings loaded');
        const finalSettingsJSON = {
            ...settingsJSON,
            ...intSettingsJSON
        };
        const templateString = fs_1.readFileSync('./assets/integration/sfmc.json.hbs').toString();
        const template = handlebars_1.compile(templateString);
        const contentJSON = template(finalSettingsJSON);
        try {
            child_process_1.default.execSync(`mkdir -p repositories/integration`);
        }
        catch (error) { }
        fs_1.writeFileSync('./repositories/integration/sfmc.json', contentJSON);
        console.log('Integration request saved to repositories/integration folder');
    }
    catch (error) {
        console.log(error.message);
    }
};
exports.handler = handler;
