import { Arguments } from 'yargs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

const childProcess = require('child_process')

export const command = 'get-content-repositories';
export const desc = "Get Content Repositories map and save to global settings";
const handle = (settingsJSON: any, argv: Arguments) => {
    // Exporting Workflow States
    console.log(`Listing Content Repositories`);
    const contentRepositories = childProcess.execSync(`npx dc-cli content-repository list --json`, { cwd: `${argv.settingsDir}/repositories` }).toString();

    // Get Content Repositories from output
    const contentRepositoriesJSON = JSON.parse(contentRepositories);

    // Build Content Repositories map for settings
    let contentRepositoriesMap: any = {};
    contentRepositoriesJSON.map((item: any) => { contentRepositoriesMap[item.name] = item.id });

    // Add Workflow States map to settings
    settingsJSON.cms.repositories = contentRepositoriesMap;
}
