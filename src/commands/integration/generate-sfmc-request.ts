import { Arguments } from 'yargs';
import { readFileSync, writeFileSync } from "fs";
import { compile as handlebarsCompile } from 'handlebars';
import childProcess from 'child_process';

const yaml = require('js-yaml');

export const command = 'generate-sfmc-request';
export const desc = "Generate SalesForce Marketing Cloud Integration Request";

export const handler = async (
  argv: Arguments
): Promise<void> => {

  try {

    // Reading specific settings
    let intSettingsYAML = readFileSync(`./settings.yaml`).toString();

    // Reading global settings
    let settingsYAML = readFileSync(`./integration.yaml`).toString();

    // Converting from YAML to JSON
    const intSettingsJSON = yaml.load(intSettingsYAML)
    const settingsJSON = yaml.load(settingsYAML)
    console.log('Global settings loaded');

    const finalSettingsJSON = {
      ...settingsJSON,
      ...intSettingsJSON
    }

    const templateString = readFileSync('./assets/integration/sfmc.json.hbs').toString();
    const template = handlebarsCompile(templateString);
    const contentJSON = template(finalSettingsJSON);

    // Create repositories folder
    try { childProcess.execSync(`mkdir -p repositories/integration`); } catch(error) {}

    writeFileSync('./repositories/integration/sfmc.json', contentJSON);
    console.log('Integration request saved to repositories/integration folder');
  } catch(error) {
    console.log(error.message);
  }
};
