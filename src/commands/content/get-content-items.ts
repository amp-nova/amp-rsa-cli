import { Arguments } from 'yargs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

const childProcess = require('child_process')
const lodash = require('lodash')

export const command = 'get-content-items';
export const desc = "Get Content Items map and save to global settings";
const handle = (settingsJSON: any) => {
    // Exporting Workflow States
    console.log(`Listing Content Items`);
    const contentItems = childProcess.execSync(
      `npx @amplience/dc-cli content-item list --json`
    ).toString();

    // Get Content Repositories from output
    const contentItemsJSON = JSON.parse(contentItems);

    // Build Content Repositories map for settings
    let contentItemsMap: any = {};
    contentItemsJSON.map((item: any) => {
      const itemName = lodash.camelCase(item.label);
      contentItemsMap[itemName] = item.id;
    });

    // Add Workflow States map to settings
    settingsJSON.cms.contentItemsMap = contentItemsMap;
}