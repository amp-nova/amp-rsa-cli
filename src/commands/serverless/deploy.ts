import { Arguments } from 'yargs';
import childProcess from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const yaml = require('js-yaml');

export const command = 'deploy';
export const desc = "Deploy AWS serverless services";

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
      console.log(`Deploying serverless service from ./repositories/${item}`);
      childProcess.execSync(
        `rm -rf .build && sls deploy --aws-profile ${settingsJSON.serverless.customProfileName}`,
        { cwd: `./repositories/${item}` }
      );
      console.log(`Saving serverless service information from ./repositories/${item}`);
      childProcess.execSync(
        `sls info --aws-profile ${settingsJSON.serverless.customProfileName} > deployment.yaml`,
        { cwd: `./repositories/${item}` }
      );

      // Removing first two lines from sls info
      childProcess.execSync(
        `sed -i -e '1,2d' deployment.yaml`,
        { cwd: `./repositories/${item}` }
      );
    });
  } catch(error) {
    console.log(error.message);
  }
};