import { Arguments } from 'yargs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';
const fs = require('fs-extra')

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

const yaml = require('js-yaml')
import { compile as handlebarsCompile } from 'handlebars';

export const command = 'generate-sfmc-request';
export const desc = "Generate SalesForce Marketing Cloud Integration Request";
const handle = (settingsJSON: any, argv: Arguments) => {
  // Reading specific settings
  let intSettingsYAML = fs.readFileSync(`${argv.settingsDir}/integration.yaml`).toString();
  const intSettingsJSON = yaml.load(intSettingsYAML)

  const templateString = fs.readFileSync(`${argv.settingsDir}/assets/integration/sfmc.json.hbs`).toString();
  const template = handlebarsCompile(templateString);
  const contentJSON = template({ ...settingsJSON, ...intSettingsJSON });

  // Create repositories folder
  fs.mkdirpSync(`${argv.settingsDir}/repositories/integration`)
  fs.writeFileSync(`${argv.settingsDir}/repositories/integration/sfmc.json`, contentJSON);
  console.log('Integration request saved to repositories/integration folder');
}
