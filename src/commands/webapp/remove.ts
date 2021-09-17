import { Arguments } from 'yargs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

const childProcess = require('child_process')

export const command = 'remove';
export const desc = "Remove Web Application";
const handle = (settingsJSON: any) => {
  // Build app name, adding hub name to app name
  const webapp = settingsJSON.app.appName.toLowerCase();

  const scope = settingsJSON.app.scope;

  // Deploying Web Application to Vercel
  console.log(`Removing Web Application ${webapp} from Vercel`);
  childProcess.execSync(`vercel remove ${webapp} --yes --scope ${scope}`, {
    stdio: [process.stdin, process.stdout, process.stdin]
  });

  // Remove Vercel production URL to settings
  delete settingsJSON.app.url;
}