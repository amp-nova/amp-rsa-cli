"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const settings_handler_1 = require("../../common/settings-handler");
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
const childProcess = require('child_process');
exports.command = 'get-hierarchies';
exports.desc = "Get Hierarchies and save to global settings";
const handle = (settingsJSON) => {
    const hierarchies = [
        { name: 'pages', key: 'homepage' },
        { name: 'taxonomies', key: 'hierarchy/taxonomies' },
        { name: 'band', key: 'hierarchy/band' },
        { name: 'location', key: 'hierarchy/location' },
        { name: 'nav', key: 'hierarchy/nav' },
        { name: 'siteSettings', key: 'hierarchy/siteSettings' }
    ];
    const allHierarchies = hierarchies.map((item) => {
        const name = item.name;
        const key = item.key;
        const output = childProcess.execSync(`npx dc-cli content-item get-by-key ${key} --json`).toString();
        return { name, contentItem: JSON.parse(output) };
    });
    settingsJSON.cms.hierarchies = {};
    allHierarchies.forEach((item) => { settingsJSON.cms.hierarchies[item.name] = item.contentItem.id; });
};
