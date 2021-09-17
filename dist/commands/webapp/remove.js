"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const settings_handler_1 = require("../../common/settings-handler");
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
const childProcess = require('child_process');
exports.command = 'remove';
exports.desc = "Remove Web Application";
const handle = (settingsJSON) => {
    const webapp = settingsJSON.app.appName.toLowerCase();
    const scope = settingsJSON.app.scope;
    console.log(`Removing Web Application ${webapp} from Vercel`);
    childProcess.execSync(`vercel remove ${webapp} --yes --scope ${scope}`, {
        stdio: [process.stdin, process.stdout, process.stdin]
    });
    delete settingsJSON.app.url;
};
