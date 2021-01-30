import { Arguments } from 'yargs';
import childProcess from 'child_process';
import { readFileSync } from 'fs';

const yaml = require('js-yaml');

export const command = 'update';
export const desc = "Update all git repositories";

export const handler = async (
  argv: Arguments
): Promise<void> => {

  try {

    // Reading global settings
    let settingsYAML = readFileSync(`./settings.yaml`).toString();

    // Converting from YAML to JSON
    const settingsJSON = yaml.load(settingsYAML)
    console.log('Global settings loaded');

    const packages = [
      "dc-content-delivery-poc",
      "willow-demo-services",
      `willow-demo-web-react-${settingsJSON.cms.hubName}`,
      // "willow-demo-cards",
      // "willow-demo-extension-personify"
    ];

    packages.map((item: string) => {
      console.log(`Updating ${item}`);
      childProcess.execSync(
          `git pull origin master`,
          { cwd: `./repositories/${item}` }
      );
    });
  } catch(error) {
    console.log(`Error ${error.message}`);
  }
};
