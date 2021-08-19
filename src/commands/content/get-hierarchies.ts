import { Arguments } from 'yargs';
import { readFileSync, writeFileSync } from 'fs';
import childProcess from 'child_process';

const yaml = require('js-yaml');
const lodash = require('lodash');

export const command = 'get-hierarchies';
export const desc = "Get Hierarchies and save to global settings";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  
  const hierarchies = [
    { name: 'pages', key: 'homepage' },
    { name: 'taxonomies', key: 'hierarchy/taxonomies' },
    { name: 'band', key: 'hierarchy/band' },
    { name: 'location', key: 'hierarchy/location' },
    { name: 'nav', key: 'hierarchy/nav' },
    { name: 'siteSettings', key: 'hierarchy/siteSettings' }
  ];

  try {

    // Reading global settings
    let settingsYAML = readFileSync(`./settings.yaml`).toString();

    // Backup settings
    writeFileSync("settings.yaml.backup", settingsYAML);

    // Converting from YAML to JSON
    const settingsJSON = yaml.load(settingsYAML)
    console.log('Global settings loaded');

    const allHierarchies =
      hierarchies.map((item: any) => {
        const name = item.name;
        const key = item.key;
        const output = childProcess.execSync(
          `dc-cli content-item get-by-key ${key} --json`
        ).toString();
        return {name, contentItem: JSON.parse(output)};
      });

    // Add Hierarchies to settings
    settingsJSON.cms.hierarchies = {};
    allHierarchies.forEach((item: any) => {
      settingsJSON.cms.hierarchies[item.name] = item.contentItem.id;
    });

    // Convert JSON to YAML and save to file
    console.log(`Saving global settings to file`);
    settingsYAML = yaml.dump(settingsJSON);
    writeFileSync(`./settings.yaml`, settingsYAML);

  } catch(error) {
    console.log(error.message);
  }
};
