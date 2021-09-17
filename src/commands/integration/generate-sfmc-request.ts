import { Arguments } from 'yargs';
import { readFileSync, writeFileSync } from 'fs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

const childProcess = require('child_process')
const yaml = require('js-yaml')
import { compile as handlebarsCompile } from 'handlebars';

export const command = 'generate-sfmc-request';
export const desc = "Generate SalesForce Marketing Cloud Integration Request";
const handle = (settingsJSON: any, argv: Arguments) => {
  // Reading specific settings
  let intSettingsYAML = readFileSync(`${argv.settingsDir}/integration.yaml`).toString();
  const intSettingsJSON = yaml.load(intSettingsYAML)

  const finalSettingsJSON = {
    ...settingsJSON,
    ...intSettingsJSON
  }

  const templateString = readFileSync(`${argv.settingsDir}/assets/integration/sfmc.json.hbs`).toString();
  const template = handlebarsCompile(templateString);
  const contentJSON = template(finalSettingsJSON);

  // Create repositories folder
  try { childProcess.execSync(`mkdir -p ${argv.settingsDir}/repositories/integration`); } catch (error) { }

  writeFileSync(`${argv.settingsDir}/repositories/integration/sfmc.json`, contentJSON);
  console.log('Integration request saved to repositories/integration folder');
}
