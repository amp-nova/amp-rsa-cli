"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = exports.command = exports.handler = exports.builder = void 0;
const handlebars_1 = require("handlebars");
const settings_handler_1 = require("../../common/settings-handler");
const fs_1 = require("fs");
const builder = (yargs) => settings_handler_1.settingsBuilder(yargs).
    demandOption(['ampRsaDir'], 'must provide path to amp-rsa installation');
exports.builder = builder;
const handler = async (argv) => settings_handler_1.settingsHandler(argv, exports.desc, exports.command, handle);
exports.handler = handler;
const childProcess = require('child_process');
exports.command = 'configure';
exports.desc = "Configure webapp config files";
const handle = (settingsJSON, argv) => {
    try {
        childProcess.execSync(`mkdir ${argv.settingsDir}/repositories`);
    }
    catch (error) { }
    console.log('Copying webapp config files to repositories folder');
    try {
        childProcess.execSync(`rm -r ${argv.settingsDir}/repositories/webapp`);
    }
    catch (error) { }
    try {
        childProcess.execSync(`mkdir -p ${argv.settingsDir}/repositories/webapp/config`);
    }
    catch (error) { }
    childProcess.execSync(`cp -r ${argv.settingsDir}/assets/webapp ${argv.settingsDir}/repositories`);
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
    const folder = `${argv.settingsDir}/repositories/webapp`;
    console.log(`Finding all templates from ${folder} folder`);
    const assetsIterator = iterateDirectory();
    const files = assetsIterator(folder);
    files.map((item) => {
        const templateString = fs_1.readFileSync(item).toString();
        const template = handlebars_1.compile(templateString);
        const contentJSON = template(settingsJSON);
        const file = item.replace('.hbs', '');
        fs_1.writeFileSync(file, contentJSON);
        console.log(`Created json from template: ${file}`);
        fs_1.unlinkSync(item);
    });
    console.log('Copying JSON config files to webapp');
    try {
        childProcess.execSync(`mkdir ${argv.ampRsaDir}/config`);
    }
    catch (error) { }
    childProcess.execSync(`cp ${argv.settingsDir}/repositories/webapp/config/*.json ${argv.ampRsaDir}/config`);
};
