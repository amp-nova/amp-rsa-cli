import { Arguments } from 'yargs';
import childProcess from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const yaml = require('js-yaml');

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

    // Backkup settings
    writeFileSync("settings.yaml.backup", settingsYAML);

    // Converting from YAML to JSON
    const settingsJSON = yaml.load(settingsYAML)
    console.log('Global settings loaded');

    // Prepare list of services in settings
    settingsJSON.serverless.services = [];

    // Cycle through the different services
    serverless.map((item: string) => {
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

      // Add service information in global settings
      settingsJSON.serverless.services.push({
        service,
        endpoint 
      });
    });

    // Convert JSON to YAML and save to file
    console.log(`Saving global settings to file`);
    settingsYAML = yaml.dump(settingsJSON);
    writeFileSync(`./settings.yaml`, settingsYAML);
  } catch(error) {
    console.log(error.message);
  }
};