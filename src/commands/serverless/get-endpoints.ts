import { Arguments } from 'yargs';
import { readFileSync, writeFileSync } from 'fs';
import childProcess from 'child_process';

const yaml = require('js-yaml');
const lodash = require('lodash');

export const command = 'get-endpoints';
export const desc = "Get AWS serverless services endpoints and save to settings";

export const handler = async (
  argv: Arguments
): Promise<void> => {

  const serverless = [
    "dc-content-delivery-poc",
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

    // Prepare list of services in settings
    settingsJSON.serverless.services = {};

    // Cycle through the different services
    serverless.map((item: string) => {
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

      console.log(`Loading serverless service information from ./repositories/${item}`);
      const deploymentYAML = readFileSync(`./repositories/${item}/deployment.yaml`).toString();
      const deploymentJSON = yaml.load(deploymentYAML);

      const endpointEntry = deploymentJSON.endpoints;
      let endpoint = endpointEntry.split(' - ')[1].replace("{proxy+}", "");

      // Remove trailing /
      if (endpoint[endpoint.length - 1] === '/') {
        endpoint = endpoint.substr(0, endpoint.length -1);
      }
      const service = deploymentJSON.service; 

      console.log(`Service: ${service}`);
      console.log(`Endpoint: ${endpoint}`);

      const serviceCamelCase = lodash.camelCase(item);

      // Add service information in global settings
      settingsJSON.serverless.services[serviceCamelCase]= {
        service,
        endpoint 
      };
    });

    // Convert JSON to YAML and save to file
    console.log(`Saving global settings to file`);
    settingsYAML = yaml.dump(settingsJSON);
    writeFileSync(`./settings.yaml`, settingsYAML);
  } catch(error) {
    console.log(error.message);
  }
};