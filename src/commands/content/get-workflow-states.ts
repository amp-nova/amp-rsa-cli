import { Arguments } from 'yargs';
import { readFileSync, writeFileSync } from 'fs';

const yaml = require('js-yaml');
const lodash = require('lodash');

export const command = 'get-workflow-states';
export const desc = "Get Workflow States map and save to global settings";

export const handler = async (
  argv: Arguments
): Promise<void> => {

  try {

    // Reading global settings
    let settingsYAML = readFileSync(`./settings.yaml`).toString();

    // Backup settings
    writeFileSync("settings.yaml.backup", settingsYAML);

    // Converting from YAML to JSON
    const settingsJSON = yaml.load(settingsYAML)
    console.log('Global settings loaded');

    // Get Workflow States IDs from export
    const workflowStates = readFileSync(`./assets/content/00-workflow-states/workflow-states-${settingsJSON.cms.hubId}-${settingsJSON.cms.hubName}.json`).toString();
    const workflowStateJson = JSON.parse(workflowStates);

    let workflowStatesMap: any = {};
    workflowStateJson.map((item: any) => {
      workflowStatesMap[lodash.camelCase(item.label)] = item.id;
    });

    // Add workflows state map to settings
    settingsJSON.cms.workflowStates = workflowStatesMap;

    // Convert JSON to YAML and save to file
    console.log(`Saving global settings to file`);
    settingsYAML = yaml.dump(settingsJSON);
    writeFileSync(`./settings.yaml`, settingsYAML);

  } catch(error) {
    console.log(error.message);
  }
};
