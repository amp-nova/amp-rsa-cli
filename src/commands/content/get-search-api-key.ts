import { Arguments } from 'yargs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

const childProcess = require('child_process')

export const command = 'get-search-api-key';
export const desc = "Get Default Theme ID and save to global settings";
const handle = (settingsJSON: any) => {
  // Get list of indexes
  const output = childProcess.execSync(
    `./node_modules/.bin/dc-cli indexes list --json`
  ).toString();
  const indexes = JSON.parse(output);

  if (indexes.length > 0) {
    const index = indexes[0];
    const searchKeyLink = index._links && index._links["hub-search-key"].href;
    if (searchKeyLink) {
      const apiKeyId = searchKeyLink.split('/').slice(-1)[0];

      // Get Algolia API Key from API Key ID
      const output = childProcess.execSync(
        `./node_modules/.bin/dc-cli indexes get-search-api-key ${index.id} ${apiKeyId} --json`
      ).toString();
      const key = JSON.parse(output);
      settingsJSON.algolia.appId = key.applicationId;
      settingsJSON.algolia.apiKey = key.key;
    }
  }
}