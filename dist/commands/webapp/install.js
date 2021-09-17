"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const settings_handler_1 = require("../../common/settings-handler");
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
const childProcess = require('child_process');
exports.command = 'install';
exports.desc = "Install Web Application";
const handle = (settingsJSON) => {
    console.log(`Installing Web Application from ..`);
    childProcess.execSync(`yarn install`, { cwd: `..` });
};
