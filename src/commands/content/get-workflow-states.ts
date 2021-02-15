import { Arguments } from 'yargs';
import { readFileSync, writeFileSync } from 'fs';
import childProcess from 'child_process';

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

    // Listing Workflow States
    console.log(`Listing Workflow States`);
    const workflowStatesList = childProcess.execSync(
      `dc-cli workflow-states list --json`,
      { cwd: `./repositories` }
    ).toString();

    // Get Workflow States from output
    const workflowStateJson = JSON.parse(workflowStatesList);

    // Build Workflow States map for settings
    let workflowStatesMap: any = {};
    workflowStateJson.map((item: any) => {
      const workflowStatesName = lodash.camelCase(item.label);

      // Filter out "Unused" Workflow States
      if (!workflowStatesName.startsWith('unused')) {
        workflowStatesMap[workflowStatesName] = item.id;
      }
    });

    // Add Workflow States map to settings
    settingsJSON.cms.workflowStates = workflowStatesMap;

    // Convert JSON to YAML and save to file
    console.log(`Saving global settings to file`);
    settingsYAML = yaml.dump(settingsJSON);
    writeFileSync(`./settings.yaml`, settingsYAML);

  } catch(error) {
    console.log(error.message);
  }
};
