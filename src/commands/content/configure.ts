import { Arguments } from 'yargs';
import { readFileSync, writeFileSync } from 'fs';

const yaml = require('js-yaml');
const lodash = require('lodash');

export const command = 'configure';
export const desc = "Configure content assets (Configuration, etc.)";

export const handler = async (
  argv: Arguments
): Promise<void> => {

  const templates = [
    "./assets/content/extensions/extensions.json.hbs",
    "./assets/content/hierarchies/hierarchy-configuration.json.hbs",
    "./assets/content/indexes/indexes.json.hbs",
    "./assets/content/webhooks/webhooks.json.hbs"
  ];

  try {

    // Reading global settings
    const settingsYAML = readFileSync(`./settings.yaml`).toString();

    // Converting from YAML to JSON
    const settingsJSON = yaml.load(settingsYAML)
    console.log('Global settings loaded');

  } catch(error) {
    console.log(error.message);
  }
};
