"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.desc = exports.command = void 0;
const fs_1 = require("fs");
const child_process_1 = __importDefault(require("child_process"));
const handlebars_1 = require("handlebars");
const yaml = require('js-yaml');
const lodash = require('lodash');
exports.command = 'configure';
exports.desc = "Configure all content assets";
const handler = async (argv) => {
    try {
        const settingsYAML = fs_1.readFileSync(`./settings.yaml`).toString();
        const settingsJSON = yaml.load(settingsYAML);
        console.log('Global settings loaded');
        try {
            child_process_1.default.execSync(`mkdir repositories`);
        }
        catch (error) { }
        console.log('Copying content assets to repositories folder');
        try {
            child_process_1.default.execSync(`rm -r ./repositories/content`);
        }
        catch (error) { }
        child_process_1.default.execSync(`cp -r ./assets/content ./repositories`);
        const iterateDirectory = () => {
            const files = [];
            const dirs = [];
            return function directoryIterator(directory) {
                try {
                    let dirContent = fs_1.readdirSync(directory);
                    dirContent.forEach(path => {
                        const fullPath = `${directory}/${path}`;
                        if (fs_1.statSync(fullPath).isFile()) {
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
        const contentFolder = './repositories/content';
        console.log(`Finding all templates from ${contentFolder} folder`);
        const assetsIterator = iterateDirectory();
        const files = assetsIterator(contentFolder);
        files.map((item) => {
            const templateString = fs_1.readFileSync(item).toString();
            const template = handlebars_1.compile(templateString);
            const contentJSON = template(settingsJSON);
            const file = item.replace('.hbs', '');
            fs_1.writeFileSync(file, contentJSON);
            console.log(`Created json from template: ${file}`);
            fs_1.unlinkSync(item);
        });
        try {
            child_process_1.default.execSync(`mkdir ../config`);
        }
        catch (error) { }
        child_process_1.default.execSync(`cp -r ./repositories/content/content-type-schemas ../config`);
        child_process_1.default.execSync(`cp -r ./repositories/content/content-types ../config`);
    }
    catch (error) {
        console.log(error.message);
    }
};
exports.handler = handler;
