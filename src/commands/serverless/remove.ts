import { Arguments } from 'yargs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

const childProcess = require('child_process')

export const command = 'remove';
export const desc = "Remove AWS serverless services";
const handle = (settingsJSON: any, argv: Arguments) => {
  const serverless = [
    "willow-demo-services"
  ];
  serverless.map((item: string) => {
    let cwd = `${argv.automationDir}/repositories/${item}`
    console.log(`Removing serverless service from ${cwd}`);
    childProcess.execSync(`sls remove --aws-profile ${settingsJSON.serverless.customProfileName}`, { cwd });
  });
}