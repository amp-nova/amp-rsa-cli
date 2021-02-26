import { Arguments } from 'yargs';
import { readFileSync, writeFileSync } from 'fs';
import childProcess from 'child_process';

const yaml = require('js-yaml');
const lodash = require('lodash');

export const command = 'get-content-items';
export const desc = "Get Content Items map and save to global settings";

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
    console.log(`Listing Content Items`);
    const contentItems = childProcess.execSync(
      `dc-cli content-item list --json`
    ).toString();

    // Get Content Repositories from output
    const contentItemsJSON = JSON.parse(contentItems);

    // Build Content Repositories map for settings
    let contentItemsMap: any = {};
    contentItemsJSON.map((item: any) => {
      const itemName = lodash.camelCase(item.label);
      contentItemsMap[itemName] = item.id;
    });

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
