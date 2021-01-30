import { Arguments } from 'yargs';
import { readFileSync, writeFileSync } from 'fs';

const yaml = require('js-yaml');
const lodash = require('lodash');

export const command = 'configure';
export const desc = "Configure all content assets";

export const handler = async (
  argv: Arguments
): Promise<void> => {

  try {

    // Reading global settings
    const settingsYAML = readFileSync(`./settings.yaml`).toString();

    // Converting from YAML to JSON
    const settingsJSON = yaml.load(settingsYAML)
    console.log('Global settings loaded');

    // Scan all handlebars files in ./assets/content and generate json files

  } catch(error) {
    console.log(error.message);
  }
};
