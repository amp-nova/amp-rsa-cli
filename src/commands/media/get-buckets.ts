import { Arguments } from 'yargs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

export const command = 'get-buckets'
export const desc = "Get media buckets"
const handle = (settingsJSON: any) => {
  const childProcess = require('child_process');
  const lodash = require('lodash');

  // Listing Assets 
  console.log(`Listing Buckets`);
  const bucketsList = childProcess.execSync(
    `./node_modules/.bin/dam-cli buckets list --json`
  ).toString();

  const bucketsListJson = JSON.parse(bucketsList);
  let bucketsMap: any = {};
  bucketsListJson.forEach((item: any) => {
    const bucketName = lodash.camelCase(item.label);
    const id = item.id;
    bucketsMap[bucketName] = id;
  });

  // Add Images map to settings
  settingsJSON.dam.bucketsMap = bucketsMap;
}