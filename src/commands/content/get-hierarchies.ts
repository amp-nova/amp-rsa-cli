import { Arguments } from 'yargs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

const childProcess = require('child_process')
const lodash = require('lodash')

export const command = 'get-hierarchies';
export const desc = "Get Hierarchies and save to global settings";
const handle = (settingsJSON: any) => {
  const hierarchies = [
    { name: 'pages', key: 'homepage' },
    { name: 'taxonomies', key: 'hierarchy/taxonomies' },
    { name: 'band', key: 'hierarchy/band' },
    { name: 'location', key: 'hierarchy/location' },
    { name: 'nav', key: 'hierarchy/nav' },
    { name: 'siteSettings', key: 'hierarchy/siteSettings' }
  ];

  const allHierarchies =
    hierarchies.map((item: any) => {
      const name = item.name;
      const key = item.key;
      const output = childProcess.execSync(
        `npx @amplience/dc-cli content-item get-by-key ${key} --json`
      ).toString();
      return { name, contentItem: JSON.parse(output) };
    });

  // Add Hierarchies to settings
  settingsJSON.cms.hierarchies = {};
  allHierarchies.forEach((item: any) => {
    settingsJSON.cms.hierarchies[item.name] = item.contentItem.id;
  });
}