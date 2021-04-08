import { Arguments } from 'yargs';
import { readFileSync, writeFileSync } from "fs";
import { compile as handlebarsCompile } from 'handlebars';
import childProcess from 'child_process';

const yaml = require('js-yaml');

export const command = 'generate-request';
export const desc = "Generate Provisioning Request";

export const handler = async (
  argv: Arguments
): Promise<void> => {

  try {

    // Reading global settings
    let settingsYAML = readFileSync(`./provisioning.yaml`).toString();

    // Converting from YAML to JSON
    const settingsJSON = yaml.load(settingsYAML)
    console.log('Global settings loaded');

    const templateString = readFileSync('./assets/provisioning/request.yaml.hbs').toString();
    const template = handlebarsCompile(templateString);
    const contentJSON = template(settingsJSON);

    // Create repositories folder
    try { childProcess.execSync(`mkdir -p repositories/provisioning`); } catch(error) {}

    writeFileSync('./repositories/provisioning/request.yaml', contentJSON);
  } catch(error) {
    console.log(error.message);
  }
};
