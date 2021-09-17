import { Arguments } from 'yargs';
import { ampRsaBuilder, settingsHandler } from '../../common/settings-handler';

export const builder = ampRsaBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

const childProcess = require('child_process')

export const command = 'install';
export const desc = "Install Web Application";
const handle = (settingsJSON: any, argv: Arguments) => {
  let cwd = argv.ampRsaDir
  console.log(`Installing Web Application from ${cwd}`);
  childProcess.execSync(`yarn install`, { cwd });
}