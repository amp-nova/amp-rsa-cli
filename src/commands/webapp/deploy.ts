import { Arguments } from 'yargs';
import { readFileSync } from 'fs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

const childProcess = require('child_process')
const lodash = require('lodash')

export const command = 'deploy';
export const desc = "Deploy Web Application";
const handle = (settingsJSON: any, argv: Arguments) => {
  // Build app name, adding hub name to app name
  const webapp = settingsJSON.app.appName.toLowerCase();

  const scope = settingsJSON.app.scope;

  // Deploying Web Application to Vercel
  console.log(`Deploying Web Application to Vercel`);
  childProcess.execSync(`vercel --prod --confirm --name ${webapp} --scope ${scope} &> ./automation/repositories/deployment.out`, {
    cwd: `..`,
    stdio: [process.stdin, process.stdout, process.stdin]
  });

  // Read deployment information
  const deploymentOutput = readFileSync(`${argv.settingsDir}/repositories/deployment.out`).toString();

  // Adding Vercel production URL to settings
  const regex = /Production: (.*?) /;
  const matches = regex.exec(deploymentOutput);
  if (matches && matches.length === 2) {
    const url = matches[1];
    settingsJSON.app.url = url;
  }
}