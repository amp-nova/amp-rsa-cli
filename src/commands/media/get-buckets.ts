import { Arguments } from 'yargs';
import { readFileSync, writeFileSync } from 'fs';
import childProcess from 'child_process';

const yaml = require('js-yaml');
const lodash = require('lodash');

export const command = 'get-buckets';
export const desc = "Get media buckets";

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

    // Listing Assets 
    console.log(`Listing Buckets`);
    const bucketsList = childProcess.execSync(
      `dam-cli buckets list --json`
    ).toString();

    const bucketsListJson = JSON.parse(bucketsList);
    let bucketsMap: any = {};
    bucketsListJson.forEach((item: any)=>{
      const bucketName = lodash.camelCase(item.label);
      const id = item.id;
      bucketsMap[bucketName] = id;
    });

    // Add Images map to settings
    settingsJSON.dam.bucketsMap = bucketsMap;

    // Convert JSON to YAML and save to file
    console.log(`Saving global settings to file`);
    settingsYAML = yaml.dump(settingsJSON);
    writeFileSync(`./settings.yaml`, settingsYAML);

  } catch(error) {
    console.log(error.message);
  }
};
