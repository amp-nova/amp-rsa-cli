import { Arguments } from 'yargs';
import childProcess from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const yaml = require('js-yaml');

export const command = 'remove';
export const desc = "Remove AWS serverless services";

export const handler = async (
  argv: Arguments
): Promise<void> => {

  const serverless = [
    "willow-demo-services"
  ];

  try {

    // Reading global settings
    let settingsYAML = readFileSync(`./settings.yaml`).toString();

    // Backup settings
    writeFileSync("settings.yaml.backup", settingsYAML);

    // Converting from YAML to JSON
    const settingsJSON = yaml.load(settingsYAML)
    console.log('Global settings loaded');

    serverless.map((item: string) => {
      console.log(`Removing serverless service from ./repositories/${item}`);
      childProcess.execSync(
        `sls remove --aws-profile ${settingsJSON.serverless.customProfileName}`,
        { cwd: `./repositories/${item}` }
      );
    });
  } catch(error) {
    console.log(error.message);
  }
};