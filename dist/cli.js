"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = __importDefault(require("yargs/yargs"));
const yargs_command_builder_options_1 = __importDefault(require("./common/yargs/yargs-command-builder-options"));
const configureYargs = (yargInstance) => {
    return new Promise(async (resolve) => {
        let failInvoked = false;
        const isYError = (err) => err instanceof Error && err.name === 'YError';
        const failFn = (msg, err) => {
            if (failInvoked) {
                return;
            }
            failInvoked = true;
            if ((msg && !err) || isYError(err)) {
                yargInstance.showHelp('error');
            }
        };
        const argv = yargInstance
            .scriptName('demo-cli')
            .usage('Usage: $0 <command> [options]')
            .commandDir('./commands', yargs_command_builder_options_1.default)
            .strict()
            .demandCommand(1, 'Please specify at least one command')
            .exitProcess(false)
            .showHelpOnFail(false)
            .fail(failFn).argv;
        resolve(argv);
    });
};
exports.default = async (yargInstance = yargs_1.default(process.argv.slice(2))) => {
    return await configureYargs(yargInstance);
};
