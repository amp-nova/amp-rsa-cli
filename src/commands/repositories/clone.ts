import { Arguments } from 'yargs';
import childProcess from 'child_process';
import { readFileSync } from 'fs';

const yaml = require('js-yaml');

export const command = 'clone';
export const desc = "Clone all required git repositories";

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
      { source: "amplience/dc-content-delivery-poc", target: "dc-content-delivery-poc" },
      { source: "amplience/willow-demo-services", target: "willow-demo-services" },
      { source: "rezakalfane/amp-rsa", target: `amp-rsa-${settingsJSON.cms.hubName}` }
      // "willow-demo-cards",
      // "willow-demo-extension-personify"
    ];
    
    childProcess.execSync(`mkdir repositories`); 

    packages.map((item: any) => {
      console.log(`Cloning ${item.source} to ${item.target}`);
      childProcess.execSync(
          `gh repo clone ${item.source} ${item.target}`,
          { cwd: `./repositories` }
      );
    });
  } catch(error) {
    console.log(error.message);
  }
};
