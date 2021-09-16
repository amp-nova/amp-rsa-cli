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
exports.command = 'get-hierarchies';
exports.desc = "Get Hierarchies and save to global settings";
const handler = async (argv) => {
    const hierarchies = [
        { name: 'pages', key: 'homepage' },
        { name: 'taxonomies', key: 'hierarchy/taxonomies' },
        { name: 'band', key: 'hierarchy/band' },
        { name: 'location', key: 'hierarchy/location' },
        { name: 'nav', key: 'hierarchy/nav' },
        { name: 'siteSettings', key: 'hierarchy/siteSettings' }
    ];
    try {
        let settingsYAML = fs_1.readFileSync(`./settings.yaml`).toString();
        fs_1.writeFileSync("settings.yaml.backup", settingsYAML);
        const settingsJSON = yaml.load(settingsYAML);
        console.log('Global settings loaded');
        const allHierarchies = hierarchies.map((item) => {
            const name = item.name;
            const key = item.key;
            const output = child_process_1.default.execSync(`dc-cli content-item get-by-key ${key} --json`).toString();
            return { name, contentItem: JSON.parse(output) };
        });
        settingsJSON.cms.hierarchies = {};
        allHierarchies.forEach((item) => {
            settingsJSON.cms.hierarchies[item.name] = item.contentItem.id;
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
