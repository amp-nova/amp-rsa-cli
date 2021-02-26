import { Arguments } from 'yargs';
import { readFileSync, writeFileSync } from 'fs';
import childProcess from 'child_process';
import { settings } from 'cluster';

const yaml = require('js-yaml');
const lodash = require('lodash');

export const command = 'get-search-api-key';
export const desc = "Get Default Theme ID and save to global settings";

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

    // Get list of indexes
    const output = childProcess.execSync(
        `dc-cli indexes list --json`
    ).toString();
    const indexes = JSON.parse(output);

    if (indexes.length >0) {
      const index = indexes[0];
      const searchKeyLink = index._links && index._links["hub-search-key"].href;
      if (searchKeyLink) {
        const apiKeyId = searchKeyLink.split('/').slice(-1)[0];

        // Get Algolia API Key from API Key ID
        const output = childProcess.execSync(
          `dc-cli indexes get-search-api-key ${index.id} ${apiKeyId} --json`
        ).toString();
        const key = JSON.parse(output); 
        settingsJSON.algolia.appId = key.applicationId;
        settingsJSON.algolia.apiKey = key.key;

        // Convert JSON to YAML and save to file
        console.log(`Saving global settings to file`);
        settingsYAML = yaml.dump(settingsJSON);
        writeFileSync(`./settings.yaml`, settingsYAML);
      }
    }

  } catch(error) {
    console.log(error.message);
  }
};
