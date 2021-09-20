import { Arguments } from 'yargs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

const childProcess = require('child_process')
const _ = require('lodash')

export const command = 'get-workflow-states';
export const desc = "Get Workflow States map and save to global settings";
const handle = (settingsJSON: any, argv: Arguments) => {
    // Listing Workflow States
    console.log(`Listing Workflow States`);

    const workflowStatesList = childProcess.execSync(`npx dc-cli workflow-states list --json`, { cwd: `${argv.automationDir}/repositories` }).toString();

    // Get Workflow States from output
    const workflowStateJson = JSON.parse(workflowStatesList);

    // Build Workflow States map for settings
    let workflowStatesMap: any = {};
    workflowStateJson.map((item: any) => {
      const workflowStatesName = _.camelCase(item.label);

      // Filter out "Unused" Workflow States
      if (!workflowStatesName.startsWith('unused') && !workflowStatesName.startsWith('archived')) {
        workflowStatesMap[workflowStatesName] = item.id;
      }
    });

    // Add Workflow States map to settings
    settingsJSON.cms.workflowStates = workflowStatesMap;
}