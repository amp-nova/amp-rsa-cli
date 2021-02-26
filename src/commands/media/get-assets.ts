import { Arguments } from 'yargs';
import { readFileSync, writeFileSync } from 'fs';
import childProcess from 'child_process';

const yaml = require('js-yaml');
const lodash = require('lodash');

export const command = 'get-assets';
export const desc = "Get media assets";

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
    console.log(`Listing Assets`);
    const assetsList = childProcess.execSync(
      `dam-cli assets list --json`
    ).toString();

    const assetsListJson = JSON.parse(assetsList);
    let imagesMap: any = {};
    assetsListJson.forEach((item: any)=>{
      const imageName = lodash.camelCase(item.name);
      const id = item.id;
      imagesMap[imageName] = id;
    });

    // Add Images map to settings
    settingsJSON.dam.imagesMap = imagesMap;

    // Convert JSON to YAML and save to file
    console.log(`Saving global settings to file`);
    settingsYAML = yaml.dump(settingsJSON);
    writeFileSync(`./settings.yaml`, settingsYAML);

  } catch(error) {
    console.log(error.message);
  }
};
