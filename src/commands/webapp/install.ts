import { Arguments } from 'yargs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

const childProcess = require('child_process')

export const command = 'install';
export const desc = "Install Web Application";
const handle = (settingsJSON: any) => {
  console.log(`Installing Web Application from ..`);
  childProcess.execSync(
    `yarn install`,
    { cwd: `..` }
  );
}