import { Arguments } from 'yargs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => await settingsHandler(argv, desc, command, handle)

export const command = 'import';
export const desc = "Import media assets";

const childProcess = require('child_process')
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
const handle = async (settingsJSON: any) => {
  const sourceType = settingsJSON.dam.source.type;
  if (sourceType === 's3') {
    const bucket = settingsJSON.dam.source.bucket;
    const region = settingsJSON.dam.source.region;
    childProcess.execSync(
      `./node_modules/.bin/dam-cli assets import-s3 ${bucket} ${region} ${settingsJSON.dam.bucketsMap.assets}`
    );
    console.log('Importing assets from S3...');
    await delay(10000);
    childProcess.execSync(
      `./node_modules/.bin/dam-cli assets publish-all ${settingsJSON.dam.bucketsMap.assets}`
    );
    console.log('Publishing all assets...');
    await delay(10000);
  }
}