import { Arguments, Argv } from 'yargs';
import { readFileSync, writeFileSync } from 'fs';
import childProcess from 'child_process';

const yaml = require('js-yaml');
const lodash = require('lodash');

export const command = 'get-content-item-by-key <key>';
export const desc = "Get Content Item by key and save ID to global settings";

export const builder = (yargs: Argv): void => {
  yargs
  .positional('key', {
    describe: 'delivery key of the content item to get',
    type: 'string'
  })
};

export const handler = async (
  argv: Arguments
): Promise<void> => {

  try {

    // Reading global settings
    let settingsYAML = readFileSync(`./settings.yaml`).toString();

    // Backup settings
    writeFileSync("settings.yaml.backup", settingsYAML);

    // Converting from YAML to JSON
    const settingsJSON = yaml.load(settingsYAML)
    console.log('Global settings loaded');

    // Exporting Workflow States
    console.log(`Getting content item with key ${argv.key}`);
    const contentItem = childProcess.execSync(
      `dc-cli content-item get-by-key ${argv.key} --json`
    ).toString();

    // Get Content Repositories from output
    const contentItemsJSON = JSON.parse(contentItem);

    // Build Content Repositories map for settings
    let contentItemsMap: any = {};
    const itemName = lodash.camelCase(contentItemsJSON.label);
    contentItemsMap[itemName] = contentItemsJSON.id;

    // Add Workflow States map to settings
    settingsJSON.cms.contentItemsMap = contentItemsMap;

    // Convert JSON to YAML and save to file
    console.log(`Saving global settings to file`);
    settingsYAML = yaml.dump(settingsJSON);
    writeFileSync(`./settings.yaml`, settingsYAML);

  } catch(error) {
    console.log(error.message);
  }
};
