import { Arguments } from 'yargs';
import childProcess from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const yaml = require('js-yaml');

export const command = 'install';
export const desc = "Install Web Application";

export const handler = async (
  argv: Arguments
): Promise<void> => {

  try {

    // Reading global settings
    let settingsYAML = readFileSync(`./settings.yaml`).toString();

    // Converting from YAML to JSON
    const settingsJSON = yaml.load(settingsYAML)
    console.log('Global settings loaded');

    console.log(`Installing Web Application from ..`);
    childProcess.execSync(
      `yarn install`,
      { cwd: `..` }
    );
  } catch(error) {
    console.log(error.message);
  }
};