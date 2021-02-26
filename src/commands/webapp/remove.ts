import { Arguments } from 'yargs';
import childProcess from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const yaml = require('js-yaml');

export const command = 'remove';
export const desc = "Remove Web Application";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  const webapp = "amp-rsa";

  try {

    // Reading global settings
    let settingsYAML = readFileSync(`./settings.yaml`).toString();

    // Converting from YAML to JSON
    const settingsJSON = yaml.load(settingsYAML)
    console.log('Global settings loaded');

    const webappFinal = `${webapp}-${settingsJSON.cms.hubName}`;

    // Deploying Web Application to Vercel
    console.log(`Deploying Web Application from ./repositories/${webappFinal} to Vercel`);
    childProcess.execSync(
      `vercel remove ${webappFinal} --yes`,
      { 
        cwd: `./repositories/${webappFinal}`,
        stdio: [process.stdin, process.stdout, process.stdin]
      }
    );

    // Read deployment information
    const deploymentOutput = readFileSync(`./repositories/${webappFinal}/deployment.out`).toString();
    
    // Backup settings
    writeFileSync("settings.yaml.backup", settingsYAML);

    // Remove Vercel production URL to settings
    delete settingsJSON.app.url;

    // Convert JSON to YAML and save to file
    console.log(`Saving global settings to file`);
    settingsYAML = yaml.dump(settingsJSON);
    writeFileSync(`./settings.yaml`, settingsYAML);
  } catch(error) {
    console.log(error.message);
  }

};