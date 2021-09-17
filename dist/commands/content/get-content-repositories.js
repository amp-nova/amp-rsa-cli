"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const settings_handler_1 = require("../../common/settings-handler");
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
const childProcess = require('child_process');
exports.command = 'get-content-repositories';
exports.desc = "Get Content Repositories map and save to global settings";
const handle = (settingsJSON) => {
    console.log(`Listing Content Repositories`);
    const contentRepositories = childProcess.execSync(`npx @amplience/dc-cli content-repository list --json`, { cwd: `./repositories` }).toString();
    const contentRepositoriesJSON = JSON.parse(contentRepositories);
    let contentRepositoriesMap = {};
    contentRepositoriesJSON.map((item) => {
        contentRepositoriesMap[item.name] = item.id;
    });
    settingsJSON.cms.repositories = contentRepositoriesMap;
};
