import { Arguments, Argv } from 'yargs';
import childProcess from 'child_process';
import { readFileSync } from 'fs';

const yaml = require('js-yaml');

export const command = 'configure';
export const desc = 'Configure CLIs';

export const handler = async (
  argv: Arguments
): Promise<void> => {
  console.log("Configuring dc-cli");
  try {

    // Reading global settings
    let settingsYAML = readFileSync(`./settings.yaml`).toString();

    // Converting from YAML to JSON
    const settingsJSON = yaml.load(settingsYAML)
    console.log('Global settings loaded');

    console.log('Configure dc-cli...');
    childProcess.execSync(
        `dc-cli configure --clientId ${settingsJSON.cms.clientId} --clientSecret ${settingsJSON.cms.clientSecret} --hubId ${settingsJSON.cms.hubId}`
      );

    console.log('Configure dam-cli...');
    childProcess.execSync(
      `dam-cli configure --username ${settingsJSON.dam.username} --password ${settingsJSON.dam.password}`
    )

    console.log('Configure aws cli...');
    childProcess.execSync(
      `serverless config credentials --provider aws --key ${settingsJSON.serverless.accessKeyId} --secret ${settingsJSON.serverless.secretAccessKey} --profile ${settingsJSON.serverless.customProfileName}`
    )
  } catch(error) {
    console.log(error.message);
  }
};
