import { Arguments } from 'yargs';
import { settingsBuilder, settingsHandler } from '../common/settings-handler';

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

export const command = 'configure';
export const desc = 'Configure CLIs';
const handle = (settingsJSON: any) => {
  const childProcess = require('child_process');

  console.log('Configure dc-cli...');
  childProcess.execSync(
    `./node_modules/.bin/dc-cli configure --clientId ${settingsJSON.cms.clientId} --clientSecret ${settingsJSON.cms.clientSecret} --hubId ${settingsJSON.cms.hubId}`
  );

  // Configure DAM CLI if needed
  if (settingsJSON.dam.username) {
    console.log('Configure dam-cli...');
    childProcess.execSync(
      `./node_modules/.bin/dam-cli configure --username ${settingsJSON.dam.username} --password ${settingsJSON.dam.password}`
    )
  }

  // Configure AWS CLI if needed
  if (false && settingsJSON.serverless.accessKeyId) {
    console.log('Configure aws cli...');
    childProcess.execSync(
      `serverless config credentials --provider aws --key ${settingsJSON.serverless.accessKeyId} --secret ${settingsJSON.serverless.secretAccessKey} --profile ${settingsJSON.serverless.customProfileName}`
    )
  }
}