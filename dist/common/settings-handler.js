"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsHandler = exports.ampRsaBuilder = exports.settingsBuilder = void 0;
const fs_1 = require("fs");
const yaml = require('js-yaml');
const settingsBuilder = (yargs) => yargs
    .options({
    automationDir: {
        alias: 'a',
        describe: 'path to automation directory',
        default: '.'
    }
})
    .help();
exports.settingsBuilder = settingsBuilder;
const ampRsaBuilder = (yargs) => exports.settingsBuilder(yargs)
    .options({
    ampRsaDir: {
        alias: 'r',
        describe: 'path to amp-rsa installation'
    },
})
    .demandOption(['ampRsaDir'], 'must provide path to amp-rsa installation');
exports.ampRsaBuilder = ampRsaBuilder;
const settingsHandler = async (argv, desc, command, callback) => {
    try {
        console.log(`[ ${command} ] ${desc}`);
        let settingsYAML = fs_1.readFileSync(`${argv.automationDir}/settings.yaml`).toString();
        fs_1.writeFileSync(`${argv.automationDir}/settings.yaml.backup`, settingsYAML);
        const settingsJSON = yaml.load(settingsYAML);
        console.log('Global settings loaded');
        await callback(settingsJSON, argv);
        console.log(`Saving global settings to file`);
        settingsYAML = yaml.dump(settingsJSON);
        fs_1.writeFileSync(`${argv.automationDir}/settings.yaml`, settingsYAML);
    }
    catch (error) {
        console.log(error.message);
    }
};
exports.settingsHandler = settingsHandler;
