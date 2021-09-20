"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const handlebars_1 = require("handlebars");
const settings_handler_1 = require("../../common/settings-handler");
const fs = require('fs-extra');
exports.builder = settings_handler_1.ampRsaBuilder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
exports.command = 'configure';
exports.desc = "Configure webapp config files";
const handle = (settingsJSON, argv) => {
    fs.mkdirpSync(`${argv.automationDir}/repositories/webapp/config`);
    console.log('Copying webapp config files to repositories folder');
    fs.removeSync(`${argv.automationDir}/repositories/webapp`);
    fs.copySync(`${argv.automationDir}/assets/webapp`, `${argv.automationDir}/repositories`);
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
    const folder = `${argv.automationDir}/repositories/webapp`;
    console.log(`Finding all templates from ${folder} folder`);
    const assetsIterator = iterateDirectory();
    const files = assetsIterator(folder);
    files.map((item) => {
        const templateString = fs.readFileSync(item).toString();
        const template = handlebars_1.compile(templateString);
        const contentJSON = template(settingsJSON);
        const file = item.replace('.hbs', '');
        fs.writeFileSync(file, contentJSON);
        console.log(`Created json from template: ${file}`);
        fs.unlinkSync(item);
    });
    console.log('Copying JSON config files to webapp');
    fs.mkdirpSync(`${argv.ampRsaDir}/config`);
    fs.copySync(`${argv.automationDir}/repositories/webapp/config/*.json`, `${argv.ampRsaDir}/config`);
};
