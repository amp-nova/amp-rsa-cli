import { Arguments } from 'yargs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

export const command = 'get-assets';
export const desc = "Get media assets";
const handle = (settingsJSON: any) => {
  const childProcess = require('child_process');
  const lodash = require('lodash');

  // Listing Assets 
  console.log(`Listing Assets`);
  const assetsList = childProcess.execSync(
    `./node_modules/.bin/dam-cli assets list ${settingsJSON.dam.bucketsMap.assets} --json`
  ).toString();

  const assetsListJson = JSON.parse(assetsList);
  let imagesMap: any = {};
  assetsListJson.forEach((item: any) => {
    const imageName = lodash.camelCase(item.name);
    const id = item.id;
    imagesMap[imageName] = id;
  });

  // Add Images map to settings
  settingsJSON.dam.imagesMap = imagesMap;
}