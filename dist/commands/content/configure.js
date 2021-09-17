"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const settings_handler_1 = require("../../common/settings-handler");
exports.builder = settings_handler_1.settingsBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
exports.command = 'configure';
exports.desc = "Configure all content assets";
const handlebars_1 = require("handlebars");
const { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } = require('fs');
const childProcess = require('child_process');
const handle = (settingsJSON, argv) => {
    try {
        childProcess.execSync(`mkdir repositories`);
    }
    catch (error) { }
    console.log('Copying content assets to repositories folder');
    try {
        childProcess.execSync(`rm -r ./repositories/content`);
    }
    catch (error) { }
    childProcess.execSync(`cp -r ./assets/content ./repositories`);
    const iterateDirectory = () => {
        const files = [];
        const dirs = [];
        return function directoryIterator(directory) {
            try {
                let dirContent = readdirSync(directory);
                dirContent.forEach((path) => {
                    const fullPath = `${directory}/${path}`;
                    if (statSync(fullPath).isFile()) {
                        if (fullPath.endsWith('.hbs')) {
                            files.push(fullPath);
                        }
                    }
                    else {
                        dirs.push(fullPath);
                    }
                });
                const directoryPop = dirs.pop();
                if (directoryPop) {
                    directoryIterator(directoryPop);
                }
                return files;
            }
            catch (ex) {
                console.log(ex);
                return files;
            }
        };
    };
    const contentFolder = `${argv.settingsDir}/repositories/content`;
    console.log(`Finding all templates from ${contentFolder} folder`);
    const assetsIterator = iterateDirectory();
    const files = assetsIterator(contentFolder);
    files.map((item) => {
        const templateString = readFileSync(item).toString();
        const template = handlebars_1.compile(templateString);
        const contentJSON = template(settingsJSON);
        const file = item.replace('.hbs', '');
        writeFileSync(file, contentJSON);
        console.log(`Created json from template: ${file}`);
        unlinkSync(item);
    });
    try {
        childProcess.execSync(`mkdir ../config`);
    }
    catch (error) { }
    childProcess.execSync(`cp -r ./repositories/content/content-type-schemas ../config`);
    childProcess.execSync(`cp -r ./repositories/content/content-types ../config`);
};
