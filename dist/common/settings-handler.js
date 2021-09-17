"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsHandler = exports.settingsBuilder = void 0;
const fs_1 = require("fs");
const yaml = require('js-yaml');
const settingsBuilder = (yargs) => yargs
    .options({
    ampRsaDir: {
        alias: 'a',
        describe: 'path to amp-rsa installation'
    },
    settingsYaml: {
        alias: 'y',
        describe: 'path to settings.yaml (defaults to ./automation)'
    }
})
    .help();
exports.settingsBuilder = settingsBuilder;
const settingsHandler = async (argv, desc, command, callback) => {
    try {
        console.log(`[ ${command} ] ${desc}`);
        let settingsYAML = fs_1.readFileSync(`${argv.settingsYaml || './automation/settings.yaml'}`).toString();
        const settingsJSON = yaml.load(settingsYAML);
        console.log('Global settings loaded');
        await callback(settingsJSON, argv);
        console.log(`Saving global settings to file`);
        settingsYAML = yaml.dump(settingsJSON);
        fs_1.writeFileSync(`${argv.settingsYaml}`, settingsYAML);
    }
    catch (error) {
        console.log(error.message);
    }
};
exports.settingsHandler = settingsHandler;