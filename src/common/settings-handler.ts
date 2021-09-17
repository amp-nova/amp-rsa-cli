import { Arguments, Argv } from 'yargs';
import { readFileSync, writeFileSync } from 'fs';

const yaml = require('js-yaml');

export const settingsBuilder = (yargs: Argv): Argv =>
    yargs
        .options({
            settingsDir: {
                alias: 's',
                describe: 'path to directory containing settings.yaml',
                default: './automation'
            }
        })
        .help();

export const ampRsaBuilder = (yargs: Argv): Argv =>
    settingsBuilder(yargs)
        .options({
            ampRsaDir: {
                alias: 'a',
                describe: 'path to amp-rsa installation'
            },
        })
        .demandOption(['ampRsaDir'], 'must provide path to amp-rsa installation')

export const settingsHandler = async (argv: Arguments, desc: string, command: string, callback: any) => {
    try {
        console.log(`[ ${command} ] ${desc}`)

        // Reading global settings
        let settingsYAML = readFileSync(`${argv.settingsDir}/settings.yaml`).toString();

        // Backup settings
        writeFileSync(`${argv.settingsDir}/settings.yaml.backup`, settingsYAML);

        // Converting from YAML to JSON
        const settingsJSON = yaml.load(settingsYAML)
        console.log('Global settings loaded');

        await callback(settingsJSON, argv)

        // Convert JSON to YAML and save to file
        console.log(`Saving global settings to file`);
        settingsYAML = yaml.dump(settingsJSON);
        writeFileSync(`${argv.settingsDir}/settings.yaml`, settingsYAML);
    } catch (error) {
        console.log(error.message);
    }
}