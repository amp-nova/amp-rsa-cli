import { Arguments } from 'yargs';
import childProcess from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const yaml = require('js-yaml');

export const command = 'install';
export const desc = "Install Web Application";

export const handler = async (
  argv: Arguments
): Promise<void> => {

  const webapp = "willow-demo-web-react";

  try {

    // Reading global settings
    let settingsYAML = readFileSync(`./settings.yaml`).toString();

    // Converting from YAML to JSON
    const settingsJSON = yaml.load(settingsYAML)
    console.log('Global settings loaded');

    const webappFinal = `${webapp}-${settingsJSON.cms.hubName}`;
  
    console.log(`Installing Web Application from ./repositories/${webappFinal}`);
    childProcess.execSync(
      `npm install`,
      { cwd: `./repositories/${webappFinal}` }
    );
  } catch(error) {
    console.log(error.message);
  }
};