import { Arguments } from 'yargs';
import { readFileSync, writeFileSync } from 'fs';
import childProcess from 'child_process';

const yaml = require('js-yaml');
const lodash = require('lodash');

export const command = 'get-default-theme-id';
export const desc = "Get Default Theme ID and save to global settings";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  
  const defaultTheme = "theme/anyafinn";

  try {

    // Reading global settings
    let settingsYAML = readFileSync(`./settings.yaml`).toString();

    // Backup settings
    writeFileSync("settings.yaml.backup", settingsYAML);

    // Converting from YAML to JSON
    const settingsJSON = yaml.load(settingsYAML)
    console.log('Global settings loaded');

    // Get default theme content item by key
    const output = childProcess.execSync(
        `dc-cli content-item get-by-key ${defaultTheme} --json`
    ).toString();
    const contentItem = JSON.parse(output);

    // Add default theme id to settings
    settingsJSON.cms.defaultThemeId = contentItem.id;

    // Convert JSON to YAML and save to file
    console.log(`Saving global settings to file`);
    settingsYAML = yaml.dump(settingsJSON);
    writeFileSync(`./settings.yaml`, settingsYAML);

  } catch(error) {
    console.log(error.message);
  }
};
