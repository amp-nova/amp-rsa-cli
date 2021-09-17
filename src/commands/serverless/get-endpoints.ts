import { Arguments } from 'yargs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';
import { readFileSync } from 'fs';

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

const childProcess = require('child_process')
const _ = require('lodash')
const yaml = require('js-yaml')

export const command = 'get-endpoints';
export const desc = "Get AWS serverless services endpoints and save to settings";
const handle = (settingsJSON: any, argv: Arguments) => {
  const serverless = ["willow-demo-services"];

  // Prepare list of services in settings
  settingsJSON.serverless.services = {};

  // Cycle through the different services
  serverless.map((item: string) => {
    let cwd = `${argv.settingsDir}/repositories/${item}`
    console.log(`Saving serverless service information from ./repositories/${item}`);
    childProcess.execSync(`sls info --aws-profile ${settingsJSON.serverless.customProfileName} > deployment.yaml`, { cwd });

    // Removing first two lines from sls info
    childProcess.execSync(`sed -i -e '1,2d' deployment.yaml`, { cwd });

    console.log(`Loading serverless service information from ${cwd}`);
    const deploymentYAML = readFileSync(`${cwd}/deployment.yaml`).toString();
    const deploymentJSON = yaml.load(deploymentYAML);

    const endpointEntry = deploymentJSON.endpoints;
    let endpoint = endpointEntry.split(' - ')[1].replace("{proxy+}", "");

    // Remove trailing /
    if (endpoint[endpoint.length - 1] === '/') {
      endpoint = endpoint.substr(0, endpoint.length - 1);
    }
    const service = deploymentJSON.service;

    console.log(`Service: ${service}`);
    console.log(`Endpoint: ${endpoint}`);

    const serviceCamelCase = _.camelCase(item);

    // Add service information in global settings
    settingsJSON.serverless.services[serviceCamelCase] = { service, endpoint };
  });
}