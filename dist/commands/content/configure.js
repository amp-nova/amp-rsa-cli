"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const settings_handler_1 = require("../../common/settings-handler");
const fs = require('fs-extra');
exports.builder = settings_handler_1.ampRsaBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
exports.command = 'configure';
exports.desc = "Configure all content assets";
const handlebars_1 = require("handlebars");
const handle = (settingsJSON, argv) => {
    fs.mkdirpSync(`${argv.automationDir}/repositories`);
    console.log('Copying content assets to repositories folder');
    fs.removeSync(`${argv.automationDir}/repositories/content`);
    fs.copySync(`${argv.automationDir}/assets/content`, `${argv.automationDir}/repositories`);
    const iterateDirectory = () => {
        const files = [];
        const dirs = [];
        return function directoryIterator(directory) {
            try {
                let dirContent = fs.readdirSync(directory);
                dirContent.forEach((path) => {
                    const fullPath = `${directory}/${path}`;
                    if (fs.statSync(fullPath).isFile()) {
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
    const contentFolder = `${argv.automationDir}/repositories/content`;
    console.log(`Finding all templates from ${contentFolder} folder`);
    const assetsIterator = iterateDirectory();
    const files = assetsIterator(contentFolder);
    files.map((item) => {
        const templateString = fs.readFileSync(item).toString();
        const template = handlebars_1.compile(templateString);
        const contentJSON = template(settingsJSON);
        const file = item.replace('.hbs', '');
        fs.writeFileSync(file, contentJSON);
        console.log(`Created json from template: ${file}`);
        fs.unlinkSync(item);
    });
    fs.mkdirpSync(`${argv.ampRsaDir}/config`);
    fs.copySync(`${argv.automationDir}/repositories/content/content-type-schemas`, `${argv.ampRsaDir}/config`);
    fs.copySync(`${argv.automationDir}/repositories/content/content-types`, `${argv.ampRsaDir}/config`);
};
